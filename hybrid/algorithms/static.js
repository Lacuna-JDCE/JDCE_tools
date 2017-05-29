/*
	static
	Static analysis algorithm for the 'hybrid' JDCE tool.

	Statically analyze the source, then returns a list of functions to remove.
	Static analysis tool copied & adapted from https://github.com/abort/javascript-call-graph
*/


const Graph = require('../graph'),
      GraphTools = require('../graph_tools'),
      static_analyzer = require('./static/static');



module.exports = function()
{
	this.run = function(settings, callback)
	{
		let called_functions = static_analyzer(settings.scripts);

		// For each function
		called_functions.forEach(function(funcs)
		{
			let called = GraphTools.find_node(funcs.called, settings.nodes)

			if( funcs.caller.start == null && funcs.caller.end == null )
			{
				caller = settings.base_node;
			}else{
				caller = GraphTools.find_node(funcs.caller, settings.nodes);
			}

			GraphTools.mark( caller, called, settings.fingerprint );
		});

		callback();
	};
};
