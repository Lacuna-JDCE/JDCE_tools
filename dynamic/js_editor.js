/*
	HTML source editor.
	Niels Groot Obbink
*/

'use strict';



require('./native_extentions');

let file_system = require('fs'),
    esprima = require('esprima');



module.exports = function()
{
	this.file_name = null;
	this.source = null;
	this.original_source = null;
	this.functions = null;
 


	this.load = function(file_name)
	{
		if(file_name)
		{
			this.file_name = file_name;
			this.original_source = this.source = file_system.readFileSync(file_name).toString();

			// Also retrieve and save a list of all functions in this script file.
			this.functions = this.get_functions( this.source );
		}
	};



	this.save = function()
	{
		if(this.file_name == null)
		{
			return;
		}

		file_system.writeFileSync( this.file_name, this.source );
	};



	this.restore = function()
	{
		this.source = this.original_source;

		this.save();
	};



	this.add_log_calls = function(logger)
	{
		let log_call,
		    offset = 0,
		    new_source = this.source;	// Start with the original source.

		for(let i = 0; i < this.functions.length; i++)
		{
			let this_function = this.functions[i];

			// Create a log call for this function.
			log_call = logger(this.file_name, this_function.start, this_function.end);

			// Insert the log call in the source.
			// Starting character position is function body location (plus one for the { character) plus length of all previously inserted log calls.
			new_source = new_source.insert(this_function.body.start + 1 + offset, log_call);

			// Increment the offset with the length of the log call, so the next insertion is at the right place.
			offset += log_call.length;
		}

		this.source = new_source;
	};



	this.get_functions = function(source)
	{
		let functions = [];

		esprima.parse(source, {range: true}, function(node, meta)
		{
			// We are only interested in functions (declarations and expressions).
			if(node.type == 'FunctionDeclaration' || node.type == 'FunctionExpression')
			{
				// Gather the data for this function in a abbreviated format.
				let function_data =
				{
					start: node.range[0],
					end: node.range[1],
					body:
					{
						start: node.body.range[0],
						end: node.body.range[1]
					}
				};

				if(node.type == 'FunctionDeclaration')
				{
					function_data.type = 'declaration';
					function_data.name = node.id.name;
				}else{
					// If it's not a FunctionDeclaration it must be a FunctionExpression.
					function_data.type = 'expression';
				}

				// Save the function data.
				functions.push(function_data);
			}
		});

		// Esprima doesn't return an ordered node list, so sort the functions based on starting position.
		functions = functions.sort(function(a, b)
		{
			return a.start - b.start;
		});

		return functions;
	};



	this.get_uncalled_functions = function(called_functions)
	{
		let uncalled_functions = [];

		this.functions.forEach(function(func)
		{
			// Check if there exists an entry in the [called_function] list that matches this [func]'s start and end location.
			let was_called = called_functions.some(function(called)
			{
				return called.start == func.start && called.end == func.end;
			});

			// Save the type, plus start/end position of the entry if it wasn't called.
			if( ! was_called )
			{
				uncalled_functions.push(
				{
					type: func.type,
					start: func.start,
					end: func.end,
					name: func.name ? func.name : ''
				});
			}
		});

		return uncalled_functions;
	};



	this.remove_nested_functions = function(functions)
	{
		let reduced = [];

		functions.forEach(function(func)
		{
			let nested = false;

			functions.forEach(function(test)
			{
				if(func.start > test.start && func.end < test.end)
				{
					nested = true;
				}
			});

			if(nested == false)
			{
				reduced.push( func );
			}
		});

		return reduced;
	};



	this.remove_functions = function(functions)
	{
		// First remove any nested entries from [functions].
		// Otherwise, we might remove an outter function, and later an inner function (which was erased with the outter function), which will mangle the source code.
		functions = this.remove_nested_functions(functions);

		// Keep track of how much we removed, as it changes the start position of subsequent functions.
		let offset = 0;
		let me = this;
		let removed = 0;

		functions.forEach(function(func)
		{
			// If the function type is an expression, replace it with an empty function, otherwise (i.e. function declaration) replace it with an empty named function.
			let insert = func.type == 'expression' ? 'function(){}' : ('function ' + func.name + '(){}');

			// Remove source code from the starting position (minus offset, i.e. the length of code we removed already), length of the function is still end - start.
			me.source = me.source.splice(func.start - offset, func.end - func.start, insert);

			// Increment offset with what we removed.
			offset += func.end - func.start;
			// Decrement offset with what we added (insert)
			offset -= insert.length;

			// Save the number of actually removed functions.
			removed++;
		});

		return removed;
	};
};
