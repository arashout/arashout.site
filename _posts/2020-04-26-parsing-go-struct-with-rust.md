---
layout: post
title: Tutorial - Parsing Go structs with LALRPOP (Rust Parsing Library)
permalink: posts/parsing-go-struct-with-rust
tags: ['lalrpop', 'rust', 'parser', 'tutorial']
published: false
---

# Introduction
## High Level Goal
- Convert Go source code for structs into a walkable AST in [Rust]() (Using [LALRPOP]())  
## Why Though
Recently for a code generation task, I used the [Go "ast" package]() to go through the fields of certain structs within our codebase at work.     
Although overall, it wasn't a bad experience I kept thinking to myself it would be kind of cool to be able to do task like this in more feature rich language.      
Lastly, there doesn't appear to be to much annotated examples of using [LALRPOP](), or at-least I couldn't find much, so I thought I could contribute a little here.

## LALRPOP

## Assumptions
- Have some familarity with Git (Enough to `git clone`)
- Have some familarity with Rust (note that I'm no expert myself)
- You've gone through the [LALRPOP book](https://lalrpop.github.io/lalrpop/README.html)
- Familarity with ASTs and what Parsing/Lexing is (Note this is covered in LALRPOP book)

# Tutorial
## Goal
The goal of this tutorial is to be able to parse a Go struct in `test_struct.go` given below:    
```go
package main

import (
    "fmt"
    "github.com/arashout/somepkg/resource"
    "github.com/arashout/somepkg/name"
)

func () {
    fmt.Println("Hello")
}

type View struct {
    Id       resource.Resource
    Name     *name.Name
    Disabled bool
    Comment *string
}
```
Into a simplified [AST]() in Rust with definitions given below:
```rust
pub struct Struct{
        name: String,
        fields: Vec<Field>,
}

pub struct Field {
    pub name: String,
    pub kind: String,
    pub package: String,
    pub ptr: bool,
}
```
Given `test_struct.go` as input, our Rust program could print:
```bash
> cat input/test.go | cargo run
"View"
        Field { name: "Id", kind: "Resource", package: "resource", ptr: false }
        Field { name: "Name", kind: "Name", package: "name", ptr: true }
        Field { name: "Disabled", kind: "bool", package: "", ptr: false }
        Field { name: "Comment", kind: "string", package: "", ptr: true }
```
NOTE: The [`go/ast`]() doesn't represent `struct`s in this manner, but's it's okay, this is a custom representation for learning purposes.

### Resources
- [Go Language Specification](https://golang.org/ref/spec) - This is pretty much tells you the grammar needs to look like

## Step 0 - Setup
**NOTE: If you already know how to setup your LALRPOP project, you can skip this section - [SKIP](#skip-setup)**

### Step 0.1 Create a new cargo project
```bash
> cargo new goparse --bin
     Created binary (application) `goparse` package
```
### Step 0.2 Create a `build.rs` and `go.lalrpop` files
Contents of `build.rs`
```bash
extern crate lalrpop;
use std::env;

fn main() {
    env::set_var("OUT_DIR", "src"); # Generated files will end-up in ./src directory
    lalrpop::Configuration::new().use_cargo_dir_conventions().process().unwrap();
}
```

Contents of `go.lalrpop`, just a copy of calculator1.lalrpop to get us started
```rust
use std::str::FromStr;

grammar;

pub Term: i32 = {
    <n:Num> => n,
    "(" <t:Term> ")" => t,
};

Num: i32 = <s:r"[0-9]+"> => i32::from_str(s).unwrap();
```

Contents of  `Cargo.toml`
```toml
[package]
name = "gointerp"
version = "0.1.0"
authors = ["Arash Outadi <arash.out@gmail.com>"]
build = "build.rs"

[build-dependencies]
lalrpop = { version = "0.18.1", features = ["lexer"] }

[dependencies]
lalrpop-util = "0.18.1"
regex = "1"
```

File Tree (What your repo should look like)
```bash
can-ml-aoutadi:goparse aoutadi$ lsd --tree
  .
├──   build.rs  # Build script that tells lalrpop where to find gramar files/ where to output them
├──   Cargo.lock
├──   Cargo.toml # Need to add lalrpop dependencies and build script
└──   src
   ├──   go.lalrpop # 
   ├──   go.rs # Generated file from go.lalrpop
   └──   main.rs
```

<a name="skip-setup"></a>

## Step 1 - Parsing Go Code
### Step 1.1 - Identifier
### Step 1.2 - Qualified Identifer
### Step 1.3 - Single Field
### Step 1.4 - Handling Whitespace
So one thing I didn't mention was that the built-in LALRPOP lexer (The part of the program that consumes text), discards all whitespace! If you need parse a language that has significant whitespace (e.g. Python), then you need to write a custom lexer.     
Luckily for us, this isn't the case with Go if you read this [section about semi-colons](https://golang.org/ref/spec#Semicolons).     

Basically, if we can figure out where to insert semi-colons then we don't actually need significant whitespace.      
    

So we want to write a function that add semi-colons in like so to our struct:
```go
type Something struct {
    Id       resource.Resource ; // <-- semi-colon!
    Name     *name.Name ; // <-- semi-colon!
    Disabled bool ; // <-- semi-colon!
    Disabled2 *bool ; // <-- semi-colon!
}
```
Here is a testcase that demonstrates the usage of our function:
```rust
use regex::Regex;

#[test]
fn semicolons(){
    let re = Regex::new(r"\s+|\t+").expect("Regex did not compile");
    let original =  "type Something struct {
        Id       resource.Resource
        Name     *name.Name
        Disabled bool
        Disabled2 *bool
        }";
    let expected = "type Something struct {
        Id       resource.Resource;
        Name     *name.Name;
        Disabled bool;
        Disabled2 *bool;
        };";
    // Just removing tabs with spaces at the end so it's easy to compare
    assert_eq!(
        re.replace_all(expected, " "), 
        re.replace_all(&insert_semicolons(original), " "),
    );
}
```

Here is a function that does what we want:
```rust
pub fn insert_semicolons(input: &str) -> String {
    let mut new_input = vec![];
    // split the input string using newlines, we want to iterate over each line
    for line in input.split("\n") {
        // look at the last significant character in the line (whitespace is trimmed)
        match line.trim().chars().last() {
            // if it's an empty line ignore
            None => (),
            Some(c) => {
                if c.is_alphanumeric() {
                    // add a semicolon to the end of theline
                    let mut new_line = String::new();
                    new_line.push_str(line);
                    new_line.push(';');
                    new_input.push(new_line);
                } 
                // if it's one of the special characters
                // For now ignore cases '++' and '--' because it's extra work...
                else if (vec![')', ']', '}']).contains(&c) {
                    // add a semi-colon to the end of the line
                    let mut new_line = String::new();
                    new_line.push_str(line);
                    new_line.push(';');
                    new_input.push(new_line);
                    
                } 
                // otherwise no semi-colon, e.g. "(\n" or 'var f = \n "hello"'
                else {
                    new_input.push(line.to_string());
                }
            }
        }
    }
    // join them again with newlines, not necessary since our lexer ignores whitespace
    // but easier to debug since it looks like original go code
    new_input.join("\n")
}
```
### Step 1.5 - Multiple Fields
### Step 2. Structs
## Step 3 - Error Recovery (Or Skipping things we don't understand)
## Step 4 - Print

# Sources

# Disclaimer
I did not get a formal computer science education and also have never taken a course on "Compilers", so take everything I say with a grain of salt.

# Appendix
