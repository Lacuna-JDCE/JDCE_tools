/*
	HTML tools
	v1.0
	Niels Groot Obbink

	Exports several functions that deal with handling HTML source code.
*/

let html_parser = require('cheerio');


module.exports =
{
	valid_types: ['text/javascript', 'application/javascript', 'application/ecmascript', 'text/ecmascript'],

	is_valid_type: function(type)
	{
		this.valid_types.forEach(function(entry)
		{
			if(type.indexOf(type) != -1)
			{
				return true;
			}
		});

		return false;
	},

	get_ordered_script_tags: function(source)
	{
		let scripts =
		{
			normal: [],
			async: [],
			defered: []
		};

		let me = this;
		let html = html_parser.load(source);
		let script_tags = html('script');

		script_tags.each(function(index, element)
		{
			// We only want script tags with either no type or a valid type.
			if(element.attribs.hasOwnProperty('type') && ! me.is_valid_type(element.attribs['type'])) return;

			// We only deal with external JS files.
			if(!element.attribs.hasOwnProperty('src')) return;

			let src = element.attribs['src'];

			if(element.attribs.hasOwnProperty('async') )
			{
				scripts.async.push(src);
			}else if(element.attribs.hasOwnProperty('defer'))
			{
				scripts.defered.push(src);
			}else{
				scripts.normal.push(src);
			}
		});

		return scripts.normal.concat(scripts.defered).concat(scripts.async);
	}
};
