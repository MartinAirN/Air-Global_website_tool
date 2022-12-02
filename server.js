'use strict';

const express = require('express');

const config = require('./config.json');
const sitestructure = require('./template/Air-Global.sitestructure.json');
const Helper = require('./helper');
// const resize = require('./imgresize');
const imageStore = require('./imageStore');
const imgPage = require('./img.js');
const imgGenerator = require('./imgGenerator.js');

//Constants
const PORT = 8081;

//App
const app = express();
app.set('view engine', 'pug');
app.use(express.static(__dirname + '/template/public'));

//Setup IMG handling
var store = new imageStore();

////IMG request handling
app.get("/img", (req,res) => {
	var imagePage = new imgPage(req.query, config);
	imagePage.returnImage(res, store);
});

//Setup Helper
var helper = new Helper();

//Setup the web pages
config.settings.pages.forEach(page => {
	app.get(page.url, (req, res) => {
		res.render(page.name, {
			title: config.site.name + " " + config.site.subTitle + " " + page.title,
			config: config,
			sitestructure: sitestructure,
			thisPage: page,
			favicon: config.site.logo,
			imgStore: store,
			helper: helper,
			request: req
		}, (err, html) => {
			if (err) {
				let visibleError = "An Error Occurred";
				if (err.default && err.message) {
					visibleError = err.default;
				}
				console.log(err);
				let page = {
					"url": "/error", "__urlcomment__": "Do not change",
					"name": "error",
					"title": "Error Page"
				}
				res.render(page.name, {
					title: config.site.name + " " + config.site.subTitle + " " + page.title,
					config: config,
					sitestructure: sitestructure,
					thisPage: page,
					favicon: config.site.logo,
					imgStore: store,
					helper: helper,
					request: req,
					error: visibleError
				});
			} else {
				res.send(html);
			}
		});
	});
});

//Running Server
const server = app.listen(PORT, () => {
	console.log(`Express running → PORT ${server.address().port}`);

	//Start IMG generator
	try {
		new imgGenerator(config).generate(store);
	} catch (e) {console.log(e);}
});
