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
1. Deploying multiple Functions can take a looong time. 
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
## Solution - Use K8s to Declaratively Deploy AWS Functions
### Target State
Let me quickly illustrate the flow in words:
1. The developer finishes work on the source code of an AWS Function and pushes their changes to git
2. This triggers a CI Job which:
    - Compiles the source code and builds a zip file meant for the AWS Function
    - The zip file is uploaded to S3 with a reproducible key (e.g. git commit SHA)
    - A manifest is generated (CRD = Custom Resource Definition) and applied to Kubernetes cluster
        - `kubectl apply -f lambda_deployment.yaml`
        - It might look something like this:
    - NOTE: If you use docker images to deploy lambdas, you can replace S3 with ECR
```yaml
apiVersion: lambda-deployment.keeptruckin.com/v1
kind: LambdaDeployment
metadata:
  name: lambda-deployment-test-function-preview
spec:
  # We control the lambda environment using the ARN
  functionARN: arn:aws:lambda:us-east-1:123:function:test-function-preview
  # These will be used to construct the key for the zip file uploaded to S3
  functionName: test-function
  commit: 8cc06dbec558fd94d9b40da92e347a34f454df61 # The SHA of the current HEAD commit
 ```
3. A custom Kubernetes controller
    - Watches the `LambdaDeployment` CRDs
    - Using the AWS SDK calls the [UpdateFunctionCode API](https://docs.aws.amazon.com/lambda/latest/dg/API_UpdateFunctionCode.html) with the respective parameters (`FunctionARN`, `S3Bucket` and `S3Key`)
4. 🎉  The AWS Function should now be deployed on AWS in preview environments
5. After testing/verification the function can be deployed to different environments by changing the `FunctionARN`
### Diagram
![Diagram of Architecture](/img/simple_lambda_deployment.png)

### Implementation
#### Build & Upload to S3
We want to upload a "ready to deploy" zip file to S3 so that we can use the `UpdateFunctionCode` API to update the function.    

This is a good candidate for a task that should live in your CI script after the code has passed testing.    
It might look something like this if you use the `aws` CLI and some bash:     
```bash
# 1. Build zip file of compiled source code
zip_path="PATH_TO_COMPILED_ZIPFILE"

# 2. Upload zip file to AWS S3 so that we can point to it when calling `update-function-code`
bucket="lambda-zips"
function_name="test-function"
commit=(git rev-parse HEAD)
# This destination key is important because it will determine where we look for code when calling `update-function-code`
# You want to include this information about the current state of the code in it. a git SHA isn't a bad idea
dst_key="${function_name}/${commit}.zip"
s3_uri="s3://${bucket}/${dst_key}"

aws s3 cp --no-progress "${zip_path}" "${s3_uri}" # The "progress" lines are SUPER noisy.
```
#### CRD and Controller
Building the custom Kubernetes controller is a bit more involved... But if you use something like the [Operator Framework]() or [Kubebuilder]() it's not so bad.    
At KT we went with the Operator Framework, you can see an toy example of the source code for the controller on [Github]() .     

I'm not going to go over all the code in the controller, as much of is generated boilerplate.     
But I will highlight a couple important portions.    
##### LambdaDeployment Struct
This is the `struct` used to generate the CRD.
```go
// LambdaDeploymentSpec defines the desired state of LambdaDeployment
type LambdaDeploymentSpec struct {
	// The ARN of the function that is to be updated
	FunctionARN string `json:"functionARN"`
	// The function name, this is used purely for building the S3 path
	FunctionName string `json:"functionName"`
	// The commit used to build the zip file uploaded to S3
	// Note that the controller expects the zip file to be in the following locations
	// s3://lambda-zip/FUNCTION_NAME>/<COMMIT>.zip
	Commit string `json:"commit"`
}
```

##### Controller Reconcile Loop
The `Reconcile` handler is the function that tries to "move the current state of the cluster to the desired state" in the spec.   
Here is a simplified version of the `Reconcile` handler for the LambdaDeployment Controller:     
```go
func (r *LambdaDeploymentReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	ld := &LambdaDeployment{}

	err := r.Get(ctx, req.NamespacedName, ld)
	switch e := err; {
	case apierrors.IsNotFound(e):
        // This corresponds to a DELETE action so we can ignore it
		log.Println("LambdaDeployment is deleted... Doing nothing?") 
		return ctrl.Result{}, nil
	case e != nil:
        log.Printf("Could not GET the LambdaDeployment: %s", err)
		return ctrl.Result{}, nil
	}

    // This is the "lambda.Client" from "github.com/aws/aws-sdk-go-v2/service/lambda"
    // We are calling the 
	_, err = r.LambdaClient.UpdateFunctionCode(ctx, &lambda.UpdateFunctionCodeInput{
		FunctionName: &ld.Spec.FunctionARN, // The ARN is the input to "FunctionName" parameter
		S3Bucket:     "lambda-zips",
		S3Key:        fmt.Sprintf("%s/%s.zip", ld.Spec.FunctionName, ld.Spec.Commit),
	})

	if err != nil {
		log.Printf("Failed UpdateFunctionCode: %s", err)
        return ctrl.Result{}, nil
	}

	return ctrl.Result{}, nil
}
```
#### Deploying the Controller 
There are a couple of steps involved in deploying a custom controller in Kubernetes.   
If you use one of the frameworks most of the required boilerplate will be generated for you, but namely it involves applying the following manifests:
- [The Custom Resource Definition (What is the LambdaDeployment resources supposed to look like)]()
- [The Controller Role Bindings (The controller is allowed to use the Kubernetes API to watch CRDs)]()
- [The Controller Deployment (The actual program with watch logic and calling the AWS API)]()
## Alternatives
### ❌  AWS Lambda Versioning and Aliases?
The first solution that pops to mind is to using the AWS builtin functionality, [Versioning](https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html) and [Aliases](https://docs.aws.amazon.com/lambda/latest/dg/configuration-aliases.html#versioning-aliases-api).    

Versioning is definitely something that would solve several of our problems:
- ✅ Rolling back function code changes is a click away
- ✅ With the Version "Description" and "RevisionId" you could include a bunch of information about the current state of the code

**Okay but how should we manage multiple environments?** You might think that using Aliases would be the answer, but you would be wrong bucko...   

The main reason is that [Aliases do not support seperate environment variables](https://stackoverflow.com/questions/42054365/amazon-lambda-alias-specific-environment-variables).    
This is a deal breaker because we need environment variables to determine which services and endpoints the lambda will interact with.     

Note that it's not IMPOSSIBLE to make this work. For example an alternative solution could have been to use Aliases (preview, staging, production) and based on the ARN (Which can be retrieved through the AWS context in the source code) use the AWS Systems Parameter Store to retrieve your environment variables. [StackOverflow Explanation](https://stackoverflow.com/a/61646448/5258887) 

Pragmatically, this seemed like a bigger change to our workflow than what were comfortable with. But perhaps it's something worth exploring in the future.
### ❌  Terraform?
TODO:
- No because having to do git changes is prohibitively slow
### ❌  Serverless
TODO:
- No because of our build system

# Caveats
## Additional Complexity at KT
At KT the implementation is a bit more complicated because we have to integrate [Bazel]() and [ArgoCD]() into the loop.   
The diagram looks more like this at KT: 
![Diagram of Architecture](/img/kt_lambda_deployment.png)   

## Community Driven Project: ACK
The AWS community is already in the midst of building Kubernetes controllers for various AWS resources (S3, SNS, SQS, ECR, DynamoDB, API Gateway) but they haven't gotten to [AWS Lambda Functions](https://github.com/aws-controllers-k8s/community/issues/197) yet 😞.     
Hopefully this custom code can be replaced once there exists an official implementation.

# Sources
https://aws.amazon.com/blogs/containers/aws-controllers-for-kubernetes-ack/