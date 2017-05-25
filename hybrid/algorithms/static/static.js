'use strict';

const path = require('path'),
      js_tools = require('./js_tools'),
      bindings = require('./javascript-call-graph/bindings'),
      astutil = require('./javascript-call-graph/astutil'),
      semioptimistic = require('./javascript-call-graph/semioptimistic');



module.exports = function(script_data)
{
	let script_sources = [];

	// Add each script source and file name to a list.
	script_data.forEach(function(script)
	{
		script_sources.push( {filename: script.file, program: script.source} );
	});

	// Build the call graph.
	let ast = astutil.buildAST(script_sources);
	bindings.addBindings(ast);

	let cg = semioptimistic.buildCallGraph(ast, false);

	let functions_called = [];

	// Retrieve all called functions
	cg.edges.iter(function(caller, called)
	{
		if(called.type == 'NativeVertex' || caller.type == 'NativeVertex')
		{
			// We don't care about native functions (e.g. Math.floor).
			return;
		};

		// Determine called.
		let file = called.func.attr.enclosingFile;
		let start = called.func.range[0];
		let end = called.func.range[1];

		// Determine caller.
		let caller_start, caller_end,
		    caller_file = caller.call.attr.enclosingFile;

		let enclosing_function = caller.call.callee.attr.enclosingFunction;

		if(enclosing_function)
		{
			caller_start = enclosing_function.range[0];
			caller_end = enclosing_function.range[1];
		}else{
			// In case it's called from the global scope.
			caller_start = caller_end = null;
		}

		function equals(a)
		{
			return a.caller.file == caller_file && a.caller.start == caller_start && a.caller.end == caller_end &&
			       a.called.file == file && a.called.start == start && a.called.end == end;
		}

		// If it's not yet in there, put it in.
		if( ! functions_called.some(equals) )
		{
			functions_called.push(
			{
				caller: {file: caller_file, start: caller_start, end: caller_end},
				called: {file: file, start: start, end: end}
			});
		}
	});

	return functions_called;
};
