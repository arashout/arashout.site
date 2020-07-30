---
layout: post
title: Tutorial - Adding Contexts via Go AST (Code Instrumentation) 
permalink: posts/add-context-with-go-ast
playground_img: https://www.pikpng.com/pngl/m/455-4550459_golang-logo-go-logo-png-transparent-png.png
tags: ['go', 'code-generation', 'parsing', 'ast', 'instrumentation', 'tutorial']
---

# Problem
You changed one function to require a `ctx context.Context` and now you have to change the function signatures of the
all the upstream functions in your codebase :angry:!   
Do you have to make all these changes manually or can you automate the process somehow?

<details>
    <summary>Spoilers</summary>
    We can automate it using Go's AST.  <br/>  
    Check out this playground link to see how to source code can be programmatically changed to include the proper 
    arguments/parameters: <br/>
    <a href="https://play.golang.org/p/b8J5BykQjK-"><img src="{{ page.playground_img }}" height="24" width="42"/> Playground Link</a>
</details>

## Illustration
We want to change this function to what is commented out in the `TODO:`

<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=before_after_func.go"></script>

And imagine the function sits inside the fictitious file below, with many other functions calling it.  
Again the `TODO:`s indicate what needs to change to make this file compile.   
NOTE: The other functions are not important, only there to illustrate we have to change all the functions that call our changed function

**Fictitious File** Notice all the TODOs
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=example.go"></script>


## Manual Solution
Fixing this manually, usually involves a trial and error solution process:
1. Adjust the function body to correctly call your new function with `ctx` arguments  
2. Adjust the function definition/signature to include a `ctx context.Context` parameter
3. Iterate until the compiler no longer complains

## <a name="pseudo-code"> Programmatic Solution (Pseudo-Code)
The algorithm for the manual solution is very simple, so on a high level to automate this process we can:
1. Parse the Go code 
2. Generate an [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree)(Abstract Syntax Tree) [3]
3. Programmatically determine where we need "inject" code, specifically:
    - `ctx` argument to a function call
    - `ctx context.Context` function parameter to function declaration
4. Edit the AST
5. Iterate until there are no more places where an "injection" is required
6. Convert the AST back into the text representation -> Our new Golang source code

# Pre-Requisites
In this tutorial I assume that:
- You are proficient with Go
- Somewhat familiar with what an AST is
  - If you want to learn more about Go's AST, I recommend this [post from Eno Compton](https://commandercoriander.net/blog/2016/12/30/reading-go-ast/)[7]

# Tutorial Conventions
## Playground Links
After a code example, I will provide a full working example via the Go Playground see you can run the code for yourself.
Look out for <span><img src="{{ page.playground_img }}" height="24" width="42"/> Playground Link</span>
## Brevity
I will often only include the minimal amount of code to demonstrate a new concept in the code examples and will generally cut out any boiler-plate code.
Look for the Playground links for full working examples.

# Setup
## Libraries
Note in this tutorial we will be using these libraries:
- github.com/dave/dst (Alternative to `go/ast`)

You can download them with the `go get` command:
<pre>
go get github.com/dave/dst
</pre>    

`github.com/dave/dst` is a fork of the official `go/ast` package that is meant specifically for **instrumenting** go code.  
In contrast `go/ast` was primarily meant for code generation.   
This is an important difference because in code instrumentation, we only want to change a very specific region of code and leave the rest of the AST exactly as it was. `go/ast` has a difficulties [achieving this, especially with comments](https://github.com/golang/go/issues/20744) [4]   

# Code
## Step 0 - Visualize the AST
Using this [go-ast visualizer](http://goast.yuroyoro.net/), we can get an idea of what the Go AST looks like and what we need to look for when injecting new code [5].  
So go to http://goast.yuroyoro.net/ and play around with these [above gists](https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js)  
  
Our primary focus should be on the on the [`FuncDecl`](https://godoc.org/github.com/dave/dst#FuncDecl) and [`CallExpr`](https://godoc.org/github.com/dave/dst#CallExpr) Nodes since our injection points will be either when we are:
- Defining a function <-- Might need to add a `ctx context.Context` parameter
- Calling a function <-- Might need to add a `ctx` argument

## Step 1 - Use "dst" to parse Go code
Before we start jumping into the logic of the program, let's just see a quick demo of how we parse Go code using the "dave/dst" package and print out the AST representation of the [`FuncDecl`](https://godoc.org/github.com/dave/dst#FuncDecl) nodes.
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=parse_simple.go"></script>

<a href="https://play.golang.org/p/w740yqGMDUY"><img src="{{ page.playground_img }}" height="24" width="42"/> Playground Link</a>

I've left comments in the above code snippet, so be sure to read those before moving on. 

## Step 2 - Helper Functions
Remember that we either need to 
- Add a `ctx context.Context` parameter to a function declaration (`FuncDecl` Node)
- Add a `ctx` argument to a function call (`CallExpr`)   
The Go AST structs for these two actions can be defined as follows:
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=helper1.go"></script>

## Step 3 - Editing the AST
To demonstrate how to add arguments and parameters using our helper functions, observe the following "naive" `applyFunc` that adds an additional `ctx` argument and `ctx context.Context` parameter to every function call and function definition respectively.   
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=example_apply_func.go"></script>
Let's use our applyFunc and print out the source code! Notice I added another utility function for converting the AST representation into actual Go code.
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=dumb_apply_print.go"></script>

<a href="https://play.golang.org/p/x6WiOgwNpTm"><img src="{{ page.playground_img }}" height="24" width="42"/> Playground Link</a>

Notice that this `applyFunc` doesn't check if it is actually necessary to inject additional code. It just does it.   
To see why this `applyFunc` is not adequate try running changing the `srcCodeString` to:
```go
package test

import (
	"fmt"
	"context"
)

func alreadyHasContext(ctx context.Context) {
	fmt.Println("Do some important work...")
	makeDownstreamRequest(ctx, "Some important data!") 
}
```
Or if you are lazy go to playground link below.   
<a href="https://play.golang.org/p/6txVwqu164P"><img src="{{ page.playground_img }}" height="24" width="42"/> Playground Link</a>

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

**Functions To Examine The `FuncDecl` & `CallExpr`**
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=selective_helpers.go"></script>
Note: the global map `needsContextsFuncs` (However, we use the `map` as a Set)

## Step 5 - Selective ApplyFunc
To make the our `ApplyFunc` function more selective we will have to examine the `FuncDecl` and `CallExpr` nodes

**Selective Apply Function**
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=selective_apply_func.go"></script>

## Step 6 - Is this it?
So now we have a Selective `ApplyFunc` will it be able to add all the `Context`s now?    
<a href="https://play.golang.org/p/pQqwOwBjaU2"><img src="{{ page.playground_img }}" height="24" width="42"/> Playground Link</a>

<details>
    <summary>Spoilers</summary>
    It doesn't
</details>

## Step 7 - Iterative Solution
Our new ApplyFunc only manages to change the immediate ancestors, but if want the changes to propagate up further we need an iterative solution.
Remember [Step 5 of our pseudo code algorithm](#pseudo-code)

### Infinite For Loop?
To make sure that all the ancestors are updated we could simply run the `Apply` with our `ApplyFunc` over and over again inside a `for {}` loop, but when should we stop?
A simple idea that will work is to stop when the previous code is the same as the current code generated.   
That is when the `ApplyFunc` deems that there are no new areas to add `ctx` arguments or `ctx context.Context` parameters.

### Code 
<script src="https://gist.github.com/arashout/3f3bad0bf3d70dc70a8e4b6fec568313.js?file=iteration.go"></script>
<a href="https://play.golang.org/p/p9hRs_Sz63c"><img src="{{ page.playground_img }}" height="24" width="42"/> Playground Link</a>

### Optional - Add comments describing iteration
Lastly, as a illustrative exercise, below is a playground link for adding comments that describe in which iteration the `ctx`/`ctx context.Context` was added  
<a href="https://play.golang.org/p/ukgiuMJIhSC"><img src="{{ page.playground_img }}" height="24" width="42"/> Playground Link</a>

Output:
```go
package test

import (
	"context"
	"fmt"
)

// Added on 'ctx context.Context' parameter on iteration 0
func changedFn(ctx context.Context) {
	fmt.Println("Do some important work...")
	// Now also make a downstream call
	makeDownstreamRequest(ctx, "Some important data!")
}

// Added on 'ctx context.Context' parameter on iteration 1
func needsctx1(ctx context.Context, n int) {
	if true {
		changedFn(ctx) // Added on ctx arg on iteration 0
	}
}

// Added on 'ctx context.Context' parameter on iteration 2
func needsctx2(ctx context.Context) bool {
	for index := 0; index < 3; index++ {
		needsctx1(ctx, 1) // Added on ctx arg on iteration 1
	}
	return true
}

// Added on 'ctx context.Context' parameter on iteration 1
func needsctx3(ctx context.Context) {
	if needsctx2(ctx) { // Added on ctx arg on iteration 2

		changedFn(ctx) // Added on ctx arg on iteration 0
	}
}

type SS struct{}

// Added on 'ctx context.Context' parameter on iteration 2
func (rec *SS) save(ctx context.Context, s string, n int) {
	needsctx1(ctx, 2) // Added on ctx arg on iteration 1
}
```

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
