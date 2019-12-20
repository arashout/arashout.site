---
layout: post
title: Bash wrappers around dangerous commands
permalink: posts/bash-wrappers-around-commands
date: 2019-12-18 00:00:00 +0000
tags:
- bash
---

Have you ever had a brain fart at work and accidentally deleted the PRODUCTION database because you thought you were in the development environment? Yeah, me too...

Here's a simple bash script that might save your life (multiple times).

Let me draw the scenario:
- Your company has different environments (prod, dev, etc...)
- It's possible to accidentally run a bash command meant for development environment in a production environment, which will have fatal consequences

Below is a fictitious wrapper function for a `dangerous_cmd` only meant to be used in a development environment.

```bash
function dangerous_cmd(){
    echo "Running dangerous_cmd wrapper"
    # Assume that dangerous_cmd environment returns the environment you are currently in
    env=$(dangerous_cmd environment) 
    if [[ $env == "development" ]]; then
        # 'command' is a bash built-in that avoids shell function lookup
        # We need this because otherwise we would be stuck in a infinite loop,
        # calling 'dangeroud_cmd` over and over again
        # '$@' passes all the arguments passed to the function to this call
        command dangerous_cmd $@; 
        return
    fi
    echo "Not in development environment! Not running dangerous_cmd"
}
```

The main workhorse of of this function is the bash built-ins `command` and `$@`
- `command`([StackOverflow Description](https://askubuntu.com/questions/512770/what-is-use-of-command-command)) runs our command without doing a shell function look-up, which we need to avoid infinitely calling `dangerous_cmd`
- `$@` passes all the parameters to this point. [Useful illustration](https://coderwall.com/p/85jnpq/bash-built-in-variables)

The good thing about using a bash function wrapper with the same name is that:
- Autocomplete still works as usual
- You can add more complex checking logic as you see fit
- You don't have to remember any obscure commands

I put bash functions like these in my `.bashrc` or `bash_profile` (Mac)

Here is an example of a wrapper function that only allows running something like `skaffold delete` (A command that cleans up your development environment by deleting all pods and services related to your application) in a `minikube` (Basically development) Kubernetes environment. 
Trust me you don't want to run `skaffold delete` in production.

```bash
function skaffold(){
    echo "Running skaffold wrapper"
    context=$(kubectl config current-context)
    if [[ $context == "minikube" ]]; then
        command skaffold $@;
        return
    fi
    echo "Not in minikube context! Not running skaffold command"
}
```