/*
	GraphTools
	Niels Groot Obbink

	Function graph tools.
*/



const Graph = require('./graph');


function build_function_graph(scripts)
{
	let nodes = [];

	// Create nodes for every function in every file.
	scripts.forEach(function(script)
	{
		script.functions.forEach(function(func)
		{
			let value =
			{
				id: script.id,
				data: func,

				compare: function(other)
				{
					// ID is per file/inline, start and end locations can't overlap in a single file.
					return this.id == other.id && this.data.start == other.data.start && this.data.end == other.data.end;
				},

				toString: function()
				{
					let name_parts = [script.file, '@', this.data.start, '-', this.data.end, ' ', this.data.type];

					if(this.data.type == 'declaration')
					{
						name_parts.push(':');
						name_parts.push(this.data.name);
					}

					return name_parts.join('');
				}
			};

			let node = new Graph.Node(value);

			nodes.push(node);
		});
	});

	// Now that we got all nodes, connect each to all other nodes.
	// Also connect to yourself (self-calling functions).
	let i, j;

	for(i = 0; i < nodes.length; i++)
	{
		for(j = 0; j < nodes.length; j++)
		{
			nodes[i].connect(nodes[j], Graph.EdgeType.CONSTRUCTED);
		}
	}

	return nodes;
}


function output_function_graph(nodes)
{
	let output = ['digraph foo'];

	output.push('{');

	nodes.forEach(function(node)
	{
		node.get_edges().forEach(function(edge)
		{
			output.push('\t"' + node.get_data() + '" -> "' + edge.get_to().get_data() + '" [label="' + Graph.edge_name(edge.get_type()) + '"];');
		});
	});

	output.push('}');

	return output.join('\n');
}


module.exports =
{
	build_function_graph: build_function_graph,
	output_function_graph: output_function_graph
};
