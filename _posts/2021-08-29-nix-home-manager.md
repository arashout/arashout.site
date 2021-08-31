---
layout: post
title: Starting out with Nix - Home Manager To The Rescue
permalink: posts/nix-home-manager
published: false
tags: ['nix']
---

1.
https://discourse.nixos.org/t/declarative-package-management-for-normal-users/1823/2
2.
https://github.com/nix-community/home-manager
3.
https://ghedam.at/24353/tutorial-getting-started-with-home-manager-for-nix
4.
https://github.com/lucperkins/nix-home-config/blob/master/home.nix#L32-L91
5.
https://hugoreeves.com/posts/2019/nix-home/
6.
https://www.youtube.com/watch?v=IUsQt4NRCnc&list=PLRGI9KQ3_HP_OFRG6R-p4iFgMSK1t5BHs&index=8
7.
https://discourse.nixos.org/t/is-this-a-good-way-to-modularize-home-manager-home-nix-for-home-work/5817/6


# Questions
- How to figure out what the package names of programs I want are?
    - Node? 
    - Where to find documentation for options? Are they the same packages in nixpkgs?
- Should I manage VSCode extensions from Nix?
- How do I decide what I manage from Nix and what I don't?
- How do I import my bash_aliases?
- How do I avoid typing out `<name>.enable = true` for everything like this guy https://github.com/lucperkins/nix-home-config/blob/master/home.nix#L98  