---
layout: post
title: Declarative AWS Lambda Function Deployment with K8s Controller
permalink: posts/declarative-lambda-deployments-with-k8s
tags: ['aws', 'lambda', 'k8s','controller']
---

# Declarative Lambda Deployments with K8s Custom Controller
## Background
At KeepTruckin we make extensive use of AWS Lambda Functions because of ease of use, inexpensive pricing and scaling capabilities.  
Currently we have over 150 Functions! So we are heavily invested in AWS Lambda.     
However, with this many Functions there are some pain-points.    
   
So before I dive into the overview and implementation of the topic of this post, let discuss the requirements and reasoning behind our decision.
## Pain
1. Deploying multiple Functions can a looong time. 
    - Especially if you naively upload a zip file to each environment (preview-fake-function, staging-fake-function, production-fake-function)
    - Even longer if you changed a common library which affects more than one function, requiring a build process
    - Even longest when uploading Go Functions because you have to include the Go runtime (10mb+)
2. Deployments are not declarative like the rest of KT infrastructure
    - We deploy our micro-services on Kubernetes and this makes deployments a breeze
    - Having to go through a seperate deployment experience for Functions is not a good developer experience. 
        - It would be much better if ALL our deployments could be managed in a single place
        - Sharing infrastructure is also a WIN because it enables the teams to share tooling.
3. Rolling back changes is difficult and time-consuming error-prone
    - Again, this is the case because we were naively uploading zip files straight to our Function
## Solution
### Diagram
![Diagram of Architecture](/img/simple_lambda_deployment.png)
### Implementation
#### Build & Upload to S3

#### CRD
#### Custom Controller

## Alternatives

### AWS Lambda Versioning and Aliases?
The first solution that pops to mind is to using the AWS builtin functionality, [Versioning](https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html) and [Aliases](https://docs.aws.amazon.com/lambda/latest/dg/configuration-aliases.html#versioning-aliases-api).    

Versioning is definitely something that would solve several of our problems:
- ✅ Rolling back function code changes is a click away
- ✅ With the Version "Description" and "RevisionId" you could include a bunch of information about the current state of the code

Okay but how should we manage multiple environments? You might think that using Aliases would be the answer, but you would be wrong bucko...
The main reason is that [Aliases do not support seperate environment variables](https://stackoverflow.com/questions/42054365/amazon-lambda-alias-specific-environment-variables).
This is a deal breaker because we need environment variables to determine which services and endpoints the lambda will interact with.     

Note that it's not IMPOSSIBLE to make this work. For example an alternative solution could have been to use Aliases (preview, staging, production) and based on the ARN use the AWS Systems Parameter Store to retrieve your environment variables. [Source](https://stackoverflow.com/a/61646448/5258887)
Pragamatically, this seemed like a bigger change to our workflow than what were comfortable with. But perhaps it's something worth exploring in the future.
### Terraform?
TODO:
- No because having to do git changes is prohibitively slow
### Serverless
TODO:
- No because of our build system


