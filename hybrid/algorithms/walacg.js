/*
	walacg
	Analysis by the WALA framework for JavaScript.

	See https://github.com/wala/WALA.
*/


const Graph = require('../graph'),
      GraphTools = require('../graph_tools'),
      walacg_analyzer = require('./walacg/walacg');



module.exports = function()
{
	this.run = function(settings, callback)
	{
		walacg_analyzer(settings.scripts, settings.directory, settings.html_file, function(called_functions)
		{
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
		});
	};
};
