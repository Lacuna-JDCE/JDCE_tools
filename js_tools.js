/*
	Script tools
	v1.0
	Niels Groot Obbink

	Exports several functions that deal with analysing and modifying JavaScript source code.
*/

require('./native_extentions');

const esprima = require('esprima');



module.exports =
{
	get_function_list: function(source_code)
	{
		let functions = [];

		// Parse the source code, retrieve nodes including range data.
		esprima.parse(source_code, {range: true}, function(node, meta)
		{
			// We are only interested in functions (declarations and expressions).
			if(node.type == 'FunctionDeclaration' || node.type == 'FunctionExpression')
			{
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
					// If it's not a FunctionDeclaration, it must be a FunctionExpression.
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
	},


	// Return a list with all uncalled functions, based on a list of all functions (gotten from this.all_functions()) and a list of function call locations (an array formatted {start, end}).
	get_uncalled_functions: function(all_functions, called_functions)
	{
		let uncalled_functions = [];

		all_functions.forEach(function(func)
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
	},


	// Remove uncalled functions from a file, given the source code and a list of uncalled functions (from this.get_uncalled_functions()).
	remove_uncalled_functions: function(source_code, uncalled_functions)
	{
		// First, remove any uncalled functions that are nested within other uncalled functions, removing an outer function also removes the inner function.
		uncalled_functions = this.remove_nested_functions(uncalled_functions);

		// Keep track of how much we removed, as it changes the start position of subsequent functions.
		let offset = 0;

		uncalled_functions.forEach(function(func)
		{
			// If the function type is an expression, replace it with an empty function, otherwise (i.e. function declaration) remove it completely.
			let insert = func.type == 'expression' ? 'function(){/*JDCE v0.1*/}' : ('function ' + func.name + '(){/* JDCE */}');

			// Remove source code from the starting position (minus offset, i.e. the length of code we removed already), length of the function is still end - start.
			source_code = source_code.splice(func.start - offset, func.end - func.start, insert);

			// Increment offset with what we removed.
			offset += func.end - func.start;
			// Decrement offset with what we added (insert)
			offset -= insert.length;
		});

		return source_code;
	},


	// Remove nested functions from a list of functions.
	remove_nested_functions: function(functions)
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
	},


	logger:
	{
		// The name of the logger function.
		name: '___JDCE_logger',

		// Returns the actual logger function as string.
		receiver: function()
		{
			return `
				const ${this.name} = function(filename, start, end)
				{
					console.log('${this.name}|' + filename + '|' +  start + ',' + end);
				}
			`;
		},

		// Returns log function call code as string.
		sender: function(filename, start, end)
		{
			return `
				${this.name}("${filename}", ${start}, ${end})
			`;
		},

		// Formats stringified log data as an object (formatted as {file, start, stop}).
		format: function(data)
		{
			let regex = /([^\|]+)\|([^\|]+)\|([0-9]+),([0-9]+)/g;
			let result = regex.exec(data);	// [data, logger_name, file_name, start, end]

			return {file: result[2], start: result[3], end: result[4]};
		}
	}
};
