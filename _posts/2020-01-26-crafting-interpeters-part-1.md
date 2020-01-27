---
layout: post
title: Working Through Crafting Interpreters - Scanning - Part 1
permalink: posts/crafting-interpreters-part-1
tags: ['rust', 'languages', 'interpreter']
published: false
---

# Intro
I recently found out about an [online book](https://craftinginterpreters.com/) being written by Bob Nystrom from hacker news.     
     

Ever since I started working with [TypeScript](https://www.typescriptlang.org/), it opened my eyes to how a well crafted programming language can significantly improve the developing experience and production 
of a engineer. From that point on, I had a lurking fascination with how programming languages are compiled/transpiled/interpreted.    
    
Anyway the online book looks really promising, it has great explanations without being too wordy, it has additional exercises at the end of each chapter and the website design is really great.    

I'm going to go through the book and to keep myself accountable I'll be sharing any progress here.      

Furthermore, I'm going to jump on the HYPE-train and write the interpreter in [Rust](https://www.rust-lang.org/), and hopefully doing so will force me to think more carefully about the actual logic of the interpreter instead of just copy and pasting the Java code from the book!     
     
Throughout these blog posts, I'll avoid re-iterating the subject matter of the book because I don't really think I have anything substantial to add there. Instead I'll try to focus on any confusions I had, the code I wrote and the challenges at the end of each chapter.

# Part 1 - Scanning

## Background
After the initial introductory chapters describing what the book is about ang getting introduced to the [Lox language](https://craftinginterpreters.com/the-lox-language.html), we get into the first chapter with code which is about Scanning.   
Scanning is just "tokenizing" the raw source code written by the programmer, which basically involves converting text like:    
```
var value = "hello";
```
into a `Vector<Token>`, where Token is a Rust Enum: 
```
[Token::KeywordVar, Token::Identifier("value"), Token::Equals, Token::Literal(Primitive::String("hello"))]
```

## Source Code
Here is the [source code](https://github.com/arashout/craftinginterperter/tree/chapter_1) for Scanning chapter.
Most of the logic is the `scanner.rs` file/module?

## Discussion
Overall there weren't too many pain points or confusing bits within this section but there are some note-worthy items worth talking about:
### Converting from Vec<char> to String is a bit annoying
I was hoping that Rust would have a similar list slicing mechanism like `list_characters[i:j]` and it kind of does ([Slice](https://doc.rust-lang.org/std/slice/)).    
But it was still kind of unwieldy to convert from a `Slice` of `char`s into a `String`.
```rust
pub fn char_range_to_string(vec: &Vec<char>, start: usize, end: usize) -> String {
    vec[start..end].iter().cloned().collect::<String>()
}

```
This function is usually called when adding `ScannerError`s or when consuming a literal.

### You don't stop when you reach an error
Hadn't really considered this before, but when you reach an error in the source code (e.g. an unexpected character) instead of immediately stopping and throwing the error, you simply add the `ScannerError` to a `Vector` and continue to consume characters. Otherwise, it would be a very annoying user experience for the programmer to fix one error at a time.

### Getting column numbers of errors is hard/tedious?
We don't go over it in the book because it would involve a "lot of grungy string munging code". This makes me respect the compiler teams at Rust/Go and other languages which have very precise indications of where you actually screwed up.

### consume_number() was less scary than I thought
I really expected that properly scanning a number would be much more difficult from a talk by Rob Pike (Forgot which one it was...) but I think a large portion of the complexity was off-loaded by the `is_numeric()` method on characters.

```rust
    fn consume_number(&mut self) {
        while self.peek().is_numeric() {
            self.advance();
        }
        // Fractional
        if self.peek() == '.' && self.peek_next().is_numeric() {
            self.advance(); // Consume '.'
            while self.peek().is_numeric() {
                self.advance();
            }
        }
        let value = char_range_to_string(&self.characters, self.start, self.current);
        self.add_token(Token::Number(
            value.parse().expect("Could not parse string into f64"),
        ))
    }
```

Also I suppose we aren't really considering complex numbers, which would make this much more complex 😄 

### I love writing unit tests in Rust
It's so easy to have the unit tests in the same file as the functions it's testing. I can't believe more programming languages don't do the same.

## Challenges

1. 
2. 
3. `Our scanner here, like most, discards comments and whitespace since those aren’t needed by the parser. Why might you want to write a scanner that does not discard those? What would it be useful for?`
One case that I wrote a [small tutorial](https://dev.to/arashout/adding-contexts-via-go-ast-code-instrumentation-2ko7) around is code injection/instrumentation. For example, when you want to programmatically insert code into an existing source file you don't want to disrupt the comments and formatting.     
Another similar more common case is code formatters/linters that automatically fix your code. Again your source code is being editted without changing the behavior or functionality, however comments and white-space are significant because they are intentionally left by the programmer 

4. `Add support to Lox’s scanner for C-style /* ... */ block comments. Make sure to handle newlines in them. Consider allowing them to nest. Is adding support for nesting more work than you expected? Why?`
Assuming I understood nesting to mean something like this testcase:
```rust
ScanTokensTestCase {
    input: "/* /* nested */ block comment */",
    expected: vec![Token::Eof],
},
```
I created the following function for dealing with nested block comments.     

The main idea is that once you are in a block comment and consuming text, continue to `advance` and if:
1. You run out of characters -> Throw an error because that means you have an unclosed block comment
2. If you see a newline -> Increment the `current_line` variable
3. You see an end of a block comment -> you can return at this point -> This is essentially our recursive base case
4. If you see a start of another block comment -> Recurse one level deeper into the `consume_block_comment`

```rust
fn consume_block_comment(&mut self) {
    // Consume '*'
    self.advance();

    loop {
        if self.is_empty() {
            self.errors.push(ScannerError::UnclosedBlockComment(Cause {
                line: self.current_line,
                source: char_range_to_string(&self.characters, self.start, self.current),
            }));
            return;
        }
        let c = self.advance();
        if c == '\n' {
            self.current_line += 1;
        } else if c == '*' && self.peek() == '/' {
            self.advance(); // Consume: '/'
            return;
        }
        // Go deeper
        else if c == '/' && self.peek() == '*' {
            self.consume_block_comment();
        }
    }
}
```

An alternative to the recursive approach is to use `depth` counter variable. Which has the added advantage of being able to handle arbitrarily nested block comments without StackOverflow.
```rust
fn consume_block_comment_iter(&mut self) {
    // Consume '*'
    self.advance();

    let mut depth = 0;
    loop {
        if self.is_empty() {
            self.errors.push(ScannerError::UnclosedBlockComment(Cause {
                line: self.current_line,
                source: char_range_to_string(&self.characters, self.start, self.current),
            }));
            return;
        }
        let c = self.advance();
        if c == '\n' {
            self.current_line += 1;
        } else if c == '*' && self.peek() == '/' {
            self.advance(); // Consume: '/'
            if depth == 0 {
                return;
            }
            depth -= 1;
        }
        // Go deeper
        else if c == '/' && self.peek() == '*' {
            depth += 1;
        }
    }
}
```