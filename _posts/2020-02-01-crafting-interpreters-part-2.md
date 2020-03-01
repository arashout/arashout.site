---
layout: post
title: Working Through Crafting Interpreters - Representing Code - Part 2
permalink: posts/crafting-interpreters-part-2
tags: ['rust', 'languages', 'interpreter']
published: false
---

The ["Representing Code" chapter](https://craftinginterpreters.com/representing-code.html) is mainly about constructing an AST.

# Challenges
1. 
2. 
3. 
```In Reverse Polish Notation (RPN), the operands to an arithmetic operator are both placed before the operator, so 1 + 2 becomes 1 2 +. Evaluation proceeds from left to right. Numbers are pushed onto an implicit stack. An arithmetic operator pops the top two numbers, performs the operation, and pushes the result. Thus, this:

(1 + 2) * (4 - 3)

in RPN becomes:

1 2 + 4 3 - *

Define a visitor class for our syntax tree classes that takes an expression, converts it to RPN, and returns the resulting string.
```

Under the assumption that everything will come in parenthesis as required 

```rust
fn rpn(expr: &Expr) -> String {
    match expr {
        Expr::Binary(o, b1, b2) => format!("{} {} {}", rpn(b1), rpn(b2), o),
        Expr::Grouping(b) => format!("{}", rpn(b)),
        Expr::Literal(p) => format!("{}", p),
        Expr::Unary(o, b) => unimplemented!(),
    }
}
```