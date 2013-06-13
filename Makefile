all: clean install test

clean:
	-rm -fr node_modules

install:
	npm install;\
	npm link;

.PHONY : test
test: 
	export NODE_PATH=./node_modules;\
	node_modules/.bin/mocha test/*.js --globals NODE_CONFIG

test-part:
	export NODE_PATH=./node_modules;\
	node_modules/.bin/mocha test/*.js --globals NODE_CONFIG --reporter junit --output ../../reports

unpublish:
	npm unpublish

publish:
	npm publish

refresh:
	npm publish --force
