---
layout: post
title: Adding Context with Go Ast (Code Generation/Instrumentation)
permalink: posts/add-context-with-go-ast
tags: ['go', 'code-generation', 'parsing', 'ast', 'instrumentation']
published: false
---

# Problem
You changed one function to require a `ctx context.Context` and now you have to change the function signatures of the
all the upstream functions in your codebase :angry:!
This problem is described pretty aptly by Michal Štrba in his [blog
post](https://faiface.github.io/post/context-should-go-away-go2/) about "context being like a virus".

## Illustration
We want to change this function
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=original_func.go"></script>

To this
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=new_func.go"></script>

Inside of the file below, where other functions call the function you just changed
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=original_code.go"></script>

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

## What is an AST?
<!-- TODO -->

# Setup
## Libraries
We'll require  with these exceptions:
- github.com/dave/dst (Alternative to `go/ast`)
- github.com/sergi/go-diff/diffmatchpatch (Pretty text diffs) 
- github.com/davecgh/go-spew (Debug print go structures)

The latter two are just for illustrative and debugging purposes but `github.com/dave/dst` is a fork of the official `go/ast` package that is meant specifically for **instrumenting** go code, in contrast `go/ast` was primarily meant for code generation. This is an important difference because in code instrumentation, we only want to change a very specific region of code and leave the rest of the AST exactly as it was. `go/ast` has a difficulties [achieving this, especially with comments](https://github.com/golang/go/issues/20744) [4]

NOTE: I had some difficulty compiling `github.com/dave/dst`, if you had as well then refer to the Appendix

# Code
## Step 0 - Visualize the AST
Using this useful [go-ast visualizer](http://goast.yuroyoro.net/), we can get an idea of what the Go AST looks like and what we need to look for when injecting new code [5].
So go to http://goast.yuroyoro.net/ and play around with these [above gists](https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js)  
  
Our primary focus should be on the on the [`FuncDecl`](https://godoc.org/github.com/dave/dst#FuncDecl) and [`CallExpr`](https://godoc.org/github.com/dave/dst#CallExpr) Nodes since our injection points will be either when we are:
- Defining a function <-- Might need to add a `ctx context.Context` parameter
- Calling a function <-- Might need to add an `ctx` argument

## Step 1 - Determine which parts of AST to edit

### FuncDecl Node
Let's look at the `FuncDecl` node for the following code.
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=new_func.go"></script>

#### Function Signature
Specifically let's start the with [`FuncType`](https://godoc.org/github.com/dave/dst#FuncType), which essentially describes the function signature
![changedFn signature](/img/changedFn_type.png)  

The feature that we care about most is [`SelectorExpr`](https://godoc.org/github.com/dave/dst#SelectorExpr) that contains the [`Ident`](https://godoc.org/github.com/dave/dst#Ident) for the `Context` parameter. With this in mind, we can construct a function to check if the `FuncDecl` contains a `context.Context` as a parameter in the function signature
<script src=https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=hasContextParam.go></script>
If it already has a `context.Context` then we don't need to do anything and can move on.

#### Function Body
When examining the function body there are two tasks we need to accomplish:
1. If we are inside a function that does not have 


## Step 2 - Utility functions
## Step 3 - Parse some go code
## Step 4 - Determine what we want to inject
## Step 5 - Inject  
## Step 6 - 
## Step 7 - Iterate
## Optional - Add comments describing iteration


# Demo

# Appendix

## Difficulties compiling `dave/dst`


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