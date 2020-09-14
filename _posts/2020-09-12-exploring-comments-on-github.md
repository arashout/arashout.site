---
layout: post
title: Explore Review Comments With Github API
permalink: posts/explore-review-comments
tags: ['python', 'github', 'comment', 'analysis', 'incomplete']
---

# Explore Review Comments With Github API (INCOMPLETE)

## Background
Recently I noticed many of the same comments from PR reviewers on the PRs throughout the codebase.    
Often simple fixes related to our own coding standards/style that newer employees aren't yet aware of or haven't internalized yet.    
    

I had recently been reading a [Fatih Arslan article about building a custom linter](https://arslan.io/2019/06/13/using-go-analysis-to-write-a-custom-linter/) and this seemed like the perfect opportunity to build a custom linter that encodes the linting rules specific to our team.    
But before I do that, I wanted to ensure that I was actually fulfilling a need and not just building an additional tool that would never be used.
It would also allow me to make a stronger case, if I were to attempt to incorporate the custom linter into the continuous integration pipeline.    
    
## Github API
### Tokens
### Code
We host our code on Github and do PR reviews there, so I can make use of the Github [List Review Comments In A Repo](https://developer.github.com/v3/pulls/comments/#list-review-comments-in-a-repository) endpoint, they even provide a nice API client [Octokit]():
```typescript
octokit.pulls.listReviewCommentsForRepo({
    owner: "<COMPANY_ORG>",
    repo: "<REPO>",
    sort: "created",
    direction: "desc",
    per_page: 100,
})
    .then(({ data }) => {
        for (const d of data) {
            // Pull out only the information I care about
            const c: Comment = {
                body: d.body, // What the actual comment says
                author: d.user.login, // The commentor login
                created_at: new Date(d.created_at),
                reply: true ? d.in_reply_to_id != null : false, // Is it reply to another comment
            };
            comments.push(c);
        }
    }).catch(e => console.error(e));
```

## Analysis
