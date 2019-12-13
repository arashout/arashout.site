---
layout: post
title: Adding Context with Go Ast (Code Generation/Instrumentation)
permalink: posts/add-context-with-go-ast
tags: ['go', 'code-generation', 'parsing', 'ast', 'instrumentation']
# published: false
---

# Problem
You changed one function to require a `ctx context.Context` and now you have to change the function signatures of the
all the upstream functions in your codebase :angry:!   
Do you have to make all these changes manually or can you automate the process somehow?

## Illustration
We want to change this function
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=original_func.go"></script>

To this
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=new_func.go"></script>

<iframe src="/assets/output.html" class="is-fullwidth">
</iframe>
Inside of the file below, where other functions call the function you just changed
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=example.go"></script>

We want all the ancestor functions of `changedFn` to have a `ctx context.Context` parameter, because they are directly or indirectly calling `changedFn` which now requires a `context.Context`
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=expected_code.go"></script>

## Manual Solution
Fixing this manually, usually involves a trial and error solution process:
1. Adjust the function body to correctly call your new function with `ctx` arguments  
2. Adjust the function definition/signature to include a `ctx context.Context` parameter
3. Iterate until the compiler no longer complains

## Programmatic Solution
The algorithm for the manual solution is very simple, so on a high level to automate this process we can:
1. Parse the go code 
2. Generate an [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree)(Abstract Syntax Tree) [3]
3. Programmatically determine where we need "inject" code, specifically:
    - `ctx` argument to a function call
    - `ctx context.Context` function parameter to function declaration
4. Edit the AST
5. Iterate until there are no more places where an "injection" is required
6. Convert the AST back into the text representation -> Our new Golang source code

If you want to learn more about Go's AST, I recommend this [post from Eno Compton](https://commandercoriander.net/blog/2016/12/30/reading-go-ast/)[7]

# Setup
## Libraries
Note in this tutorial we will be using these libraries:
- github.com/dave/dst (Alternative to `go/ast`)
- github.com/sergi/go-diff/diffmatchpatch (Pretty text diffs) 
- github.com/davecgh/go-spew (Debug print go structures)

You can download them with the `go get` command:
```
go get github.com/dave/dst
go get github.com/sergi/go-diff/diffmatchpatch
go get github.com/davecgh/go-spew
```

The latter two are just for illustrative and debugging purposes but `github.com/dave/dst` is a fork of the official `go/ast` package that is meant specifically for **instrumenting** go code, in contrast `go/ast` was primarily meant for code generation. This is an important difference because in code instrumentation, we only want to change a very specific region of code and leave the rest of the AST exactly as it was. `go/ast` has a difficulties [achieving this, especially with comments](https://github.com/golang/go/issues/20744) [4]

NOTE: I had some difficulty compiling `github.com/dave/dst`, if you had as well then refer to the Appendix

# Code
## Step 0 - Visualize the AST
Using this useful [go-ast visualizer](http://goast.yuroyoro.net/), we can get an idea of what the Go AST looks like and what we need to look for when injecting new code [5].
So go to http://goast.yuroyoro.net/ and play around with these [above gists](https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js)  
  
Our primary focus should be on the on the [`FuncDecl`](https://godoc.org/github.com/dave/dst#FuncDecl) and [`CallExpr`](https://godoc.org/github.com/dave/dst#CallExpr) Nodes since our injection points will be either when we are:
- Defining a function <-- Might need to add a `ctx context.Context` parameter
- Calling a function <-- Might need to add a `ctx` argument

## Step 1 - Use "dst" to parse Go code
Before we start jumping into the logic of the program, let's just see a quick demo of how we parse Go code using the "dave/dst" package and print out the AST representation of the [`FuncDecl`](https://godoc.org/github.com/dave/dst#FuncDecl) nodes.
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=parse_simple.go"></script>
Here's a [playground link, run it to see what it does!](https://play.golang.org/p/Q_SeZSnir1n)

I've left comments in the above code snippet, so be sure to read those before moving on. 

## Step 2 - Helper Functions
Remember that we either need to 
- Add a `ctx context.Context` parameter to a function declaration (`FuncDecl` Node)
- Add a `ctx` argument to a function call (`CallExpr`)
The Go AST structs for these two actions can be defined as follows:
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=helper1.go"></script>

## Step 3 - Editing the AST
To demonstrate how to add arguments and parameters using our helper functions, observe the following "dumb" `applyFunc` (It is dumb because it adds a `ctx` and `context.Context` unconditionally, even when they are not needed!) that adds an additional `ctx` argument and `ctx context.Context` parameter to every function call and function definition respectively.
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=example_apply_func.go"></script>
Let's use our applyFunc and print out the source code! Notice I added another utility function for converting the AST representation into actual Go code.
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=dumb_apply_print.go"></script>

Assuming that you have the `example.go` file, described at the start of the post and a directory structure like this:
```
├── main.go
├── test
    └── example.go
```
Try running it locally.  

TODO: Upload a playground link 
Otherwise here's a [playground link, run it to see what it does!](https://play.golang.org/p/Q_SeZSnir1n)   
(NOTE: Instead of reading a file, I simply pass a string into `dst.Parse`, which simplifies the code a little bit)


## Step 4 - Being Selective
Instead of indiscriminately adding `ctx` everywhere like in the naive implementation, this time we will examine the nodes in the AST to determine where we need to inject a `ctx` argument or `ctx content.Context` function parameter.

### FuncDecl Node
Let's look at the `FuncDecl`, node for the following code.
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=new_func.go"></script>

#### Function Signature
Specifically let's start the with [`FuncType`](https://godoc.org/github.com/dave/dst#FuncType), which essentially describes the function signature
![changedFn signature](/img/changedFn_type.png)  

The feature that we care about most is [`SelectorExpr`](https://godoc.org/github.com/dave/dst#SelectorExpr) that contains the [`Ident`](https://godoc.org/github.com/dave/dst#Ident) for the `Context` parameter. With this in mind, we can construct a function to check if the `FuncDecl` contains a `context.Context` as a parameter in the function signature
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=hasContextParam.go"></script>
If it already has a `context.Context` then we don't need to do anything and can move on.

#### Function Body
To determine if we need to add a `context.Context` to the function signature, we need to examine the function body to check if there are any calls to functions which require a `context.Context` parameter.    
At this point, you might be asking how we can know if a function requires a `Context` in the first place?

Below are two possible ways of determining that:
1. If there is a function call to a function we have already determined needs a `Context` (Infinite Recursion 😆)
    - Obviously, we would need a mechanism for recording which functions have `Context` parameters
    - Also we need a "seed" function which already has `Context` parameter, so we have at-least one function which we KNOW requires `Context`
2. We can naively look for function calls that have a argument named `ctx`

In this tutorial, we'll go over method 2 as it slightly simpler and doesn't require an initial scan.

## Step 5 - Selective ApplyFunc
To make the our `ApplyFunc` function more selective we will have to examine the `FuncDecl` and `CallExpr` nodes
<details>
  <summary>Selective Apply Function</summary>
  <script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=selective_apply_func.go"></script>
</details>
    
We also need to define some more helpful functions 
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=selective_helpers.go"></script>
Note: the global map `needsContextsFuncs` (However, we use the `map` as a Set)

## Step 6 - Is this it?
So now we have a Selective `ApplyFunc` will it be able to add all the `Context`s now?    
Run this [playground link to find out]()
<details>
    <summary>Spoilers</summary>
    It doesn't
</details>

## Step 7 - Iterate
Our new ApplyFunc only manages to change the initial ancestor itself, if want the changes to propagate up we need an iterative solution.
The basic idea is that we'll keep running `Apply` with our `ApplyFunc` until the generated source code stops changing


## Optional - Add comments describing iteration
[Playground Link](https://play.golang.org/p/KZMCDcvdiYs)

# Appendix

## Difficulties compiling `dave/dst`
<!-- TODO -->

## Related Reading
- I recommend this article about [Instrumenting Go code via AST](https://developers.mattermost.com/blog/instrumenting-go-code-via-ast/) which served as the basis of this post.  
In some ways, they are solving a simpler problem because the function signature that they need to change is always the same, where in our case it can vary.

# Sources
1. https://faiface.github.io/post/context-should-go-away-go2/
2. https://medium.com/@cep21/how-to-correctly-use-context-context-in-go-1-7-8f2c0fafdf39
3. https://en.wikipedia.org/wiki/Abstract_syntax_tree
4. https://github.com/golang/go/issues/20744 "Free-floating comments are single-biggest issue when manipulating the AST"
5. http://goast.yuroyoro.net/ Golang AST visualizer
6. https://godoc.org/github.com/dave/dst GoDoc for github.com/dave/dst package
7.  https://commandercoriander.net/blog/2016/12/30/reading-go-ast/

# TODO
- [ ] Update all playground links
- [ ] Add Gopher image to playground links
- [ ] Add appendix entry for compiling `dave/dst`
- [ ] Have a demo at the top
- [ ] Split up code blocks
- [ ] Move changedFunction to top of code snippets
- [ ] Make everything collapsible!
- [ ] Have interesting hook at the start