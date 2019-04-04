import { Review } from "./Review"
import { writeFileSync } from "fs";

const request = require('request');
const convert = require('xml-js');

const fs = require('fs');

const USER_ID = 18351401;

const creds = {
    key: process.env['GD_API_KEY'],
    secret: process.env['GD_SECRET']
};

const base = {
    key: creds.key,
    v: 2
};
const baseURL = `https://www.goodreads.com`;

interface ReducedReview {

}

let url = `${baseURL}/review/list/${USER_ID}.xml`;
request({
    url: url,
    qs: base
}, function (err: any, response: any) {
    if (err) {
        console.log(err);
        return;
    }
    if (response.statusCode === 200) {
        const jsonResponse = JSON.parse(convert.xml2json(response.body, {
            compact: true
        }));
        const reducedReviews: ReducedReview[] = [];
        const reviews: Review[] = jsonResponse.GoodreadsResponse.reviews.review
        for (const review of reviews) {
            // console.log(review.shelves.shelf)
            if (review.shelves.shelf._attributes.name === 'read'){
                console.log(review.body._cdata);
                reducedReviews.push(
                    {
                        review: review.body._cdata,
                        rating: review.rating,
                        book: {
                            title: review.book.title,
                            image: review.book.image_url,
                        }
                    }
                );
            }
        }
        writeFileSync('data.json', JSON.stringify({reviews: reducedReviews}));
    }
    else {
        console.error("Response Code is: " + response.statusCode);
    }
});