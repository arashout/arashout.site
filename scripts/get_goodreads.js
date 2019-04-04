"use strict";
exports.__esModule = true;
var fs_1 = require("fs");
var request = require('request');
var convert = require('xml-js');
var fs = require('fs');
var USER_ID = 18351401;
var creds = {
    key: process.env['GD_API_KEY'],
    secret: process.env['GD_SECRET']
};
var base = {
    key: creds.key,
    v: 2
};
var baseURL = "https://www.goodreads.com";
var url = baseURL + "/review/list/" + USER_ID + ".xml";
request({
    url: url,
    qs: base
}, function (err, response) {
    if (err) {
        console.log(err);
        return;
    }
    if (response.statusCode === 200) {
        var jsonResponse = JSON.parse(convert.xml2json(response.body, {
            compact: true
        }));
        var reducedReviews = [];
        var reviews = jsonResponse.GoodreadsResponse.reviews.review;
        for (var _i = 0, reviews_1 = reviews; _i < reviews_1.length; _i++) {
            var review = reviews_1[_i];
            // console.log(review.shelves.shelf)
            if (review.shelves.shelf._attributes.name === 'read') {
                console.log(review.body._cdata);
                reducedReviews.push({
                    review: review.body._cdata,
                    rating: review.rating,
                    book: {
                        title: review.book.title,
                        image: review.book.image_url
                    }
                });
            }
        }
        fs_1.writeFileSync('data.json', JSON.stringify({ reviews: reducedReviews }));
    }
    else {
        console.error("Response Code is: " + response.statusCode);
    }
});
