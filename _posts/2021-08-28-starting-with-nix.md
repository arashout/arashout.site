---
layout: post
title: Starting out with Nix - A Misguided Adventure
permalink: posts/starting-nix
published: true
tags: ['nix']
---

Ever since I saw this **black magic** technology that we use at KeepTruckin to drastically improve developer productivity by basically removing the dependency installation process, I was hooked and determined to learn more.     
I've been trying to write a blog post about how we use `Nix` at KT by asking the domain experts at our company but I thought it would also be worthwhile if I installed it on my system and tried to go about my normal workflow using it.    
Note that I didn't go "all in" by installing [`NixOS`](https://nixos.org/) but instead opted to just install `Nix` on a Lubuntu distro. I still want to play games 😅.

So without further ado, here is my notes and struggles on the learning and using `Nix`.

# Installing Nix
So as I mentioned I didn't want the `NixOS` distro but simply the package management tool called `Nix`. So I went ahead and downloaded it using the [instructions from this page](https://nixos.org/guides/install-nix.html):
```bash
sh <(curl -L https://nixos.org/nix/install) --daemon
nix-env --version
# nix-env (Nix) 2.3.15
```

# Getting VSCode
The next thing I needed was [VSCode]() so I could start this blog post...     
I actually ran into some trouble [following the instructions from this page](https://nixos.wiki/wiki/Vscode). If I simply use: `nix-env -iA nixos.vscode`      
I get the error below:
```bash
nix-env -iA nixos.vscode
# error: attribute 'nixos' in selection path 'nixos.vscode' not found
```

[From this forum post], I figured out that I'm supposed to prepend the `channel` that I AM *registered* to. 
```bash
nix-channel --list
# nixpkgs https://nixos.org/channels/nixpkgs-unstable

# Okay so like this right?
nix-env -iA nixpkgs-unstable.vscode 
# Nope: "error: attribute 'nixpkgs-unstable' in selection path 'nixpkgs-unstable.vscode' not found"

# How about this
nix-env -iA unstable.vscode 
# Nope: "error: attribute 'unstable' in selection path 'nixpkgs-unstable.vscode' not found"

# Third time is the charm ☑️
nix-env -iA nixpkgs.vscode
``` 

**Question: Should I edit the documentation on https://nixos.wiki/wiki/Vscode to explain this detail? Or is it not relevant in the `NixOS` documentation? Where is `Nix` specific documentation?**

# Questions!
- Where is my `configuration.nix`! 
    - Managing extensions in VSCode requires putting code in there
- Having a hard time figuring out how to get zsh shell

# I WAS MISGUIDED
So **HILARIOUSLY** enough I learned that this is NOT the optimal way to manage your environment setup because it's not declarative; Which is what `Nix` is all ABOUT.   
I've seen moved on to using [`home-manager`](https://github.com/nix-community/home-manager), which I will detail in my next blog post.