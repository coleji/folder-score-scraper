#! /usr/bin/node
var http = require("http");
var ini = require("ini");
var mysql = require("mysql");
var fs = require("fs");


const SCORE_REGEX = /<TD> Score <\/TD>\s*<TD><font size=3>\s*<b> ([0-9]*) <\/b>/;
const WU_REGEX = /<TD> WU<\/TD>\s*<TD> <font size=3>\s*<b> ([0-9]*) <\/b>/;

const INI_DATA = ini.parse(fs.readFileSync('./private.ini', 'utf-8'));
const DB_OPTIONS = INI_DATA.database;
const URL = INI_DATA.url.url;

var globalHTML;
var doSaveToDB = false;
var dbProperties = {
	stampDateTime : new Date()
};

new Promise(function(resolve, reject) {
	var req = http.get(URL, function(res) {
		let rawData = '';
		res.on('data', (chunk) => rawData += chunk);
		res.on('end', () => {
			resolve(rawData);
		});
	}).on('error', (e) => {
		reject(e)
	});
}, function(err) {
	console.log("Couldnt get HTML: " + err)
}).then(function(html) {
	globalHTML = html
	var result = SCORE_REGEX.exec(globalHTML);
	if (result && result.length >= 2) return Promise.resolve(result[1]);
	else return Promise.reject();
}).then(function(score) {
	console.log("Score is " + score);
	doSaveToDB = true;
	dbProperties.score = score;
}).catch(function() {
	console.log("couldnt find Score");
}).then(function() {
	var result = WU_REGEX.exec(globalHTML);
	if (result && result.length >= 2) return Promise.resolve(result[1]);
	else return Promise.reject();
}).then(function(wu) {
	console.log("WU is " + wu);
	doSaveToDB = true;
	dbProperties.wu = wu;
}).catch(function() {
	console.log("couldnt find WU");
}).then(function() {
	if (!doSaveToDB) return;
	console.log("Writing to DB!")
	var conn = mysql.createConnection(DB_OPTIONS);
	conn.connect();
	conn.query('insert into scores set ?', dbProperties, function(err) {
		if (err) console.log("db err: " + err)
		conn.end();
	});
}).catch(function(err) {
	console.log("Error: " + err);
});
