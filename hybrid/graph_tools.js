/*
	GraphTools
	Niels Groot Obbink

	Function graph tools.
*/



const Graph = require('./graph');



// Create a 'caller' node, which simulates [the index.html / any js file] that calls a function directly.
let base_caller_node = new Graph.Node(
{
	script_id: -1,
	data: '<base caller node>',
	equals: function(other)
	{
		// This is the only 'function' node with id -1.
		return this.script_id == other.script_id;
	},
	toString: function()
	{
		return '<base caller node>';
	}
});



function build_function_graph(scripts, constructed_edge_value)
{
	let nodes = [];

	// Create nodes for every function in every file.
	scripts.forEach(function(script)
	{
		script.functions.forEach(function(func)
		{
			let value =
			{
				script_id: script.id,
				script_name: script.file,
				data: func,

				equals: function(other)
				{
					// ID is per file/inline, start and end locations can't overlap in a single file.
					return this.script_id == other.script_id && this.data.start == other.data.start && this.data.end == other.data.end;
				},

				toString: function()
				{
					let name = script.type == 'inline' ? '<html>' : script.file;
					let name_parts = [name, '@', this.data.start, '-', this.data.end, ' ', this.data.type];

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
	// Also connect to yourself (i.e. for recursive functions).
	let i, j;

	for(i = 0; i < nodes.length; i++)
	{
		// Base caller -> this node.
		base_caller_node.connect( nodes[i], constructed_edge_value );

		for(j = 0; j < nodes.length; j++)
		{
			nodes[i].connect(nodes[j], constructed_edge_value);
		}
	}

	// Add the base caller node last, so it doesn't connect to itself, above.
	nodes.push(base_caller_node);

	return nodes;
}


function get_base_caller_node(nodes)
{
	for(let i = 0; i < nodes.length; i++)
	{
		if( nodes[i].equals(base_caller_node) )
		{
			return nodes[i];
		}
	}
};


function edge_name(value, fingerprints)
{
	let i,
	    names = [];

	for(i = 0; i < fingerprints.length; i++)
	{
		if(value & fingerprints[i].value)
		{
			names.push( fingerprints[i].name );
		}
	}

	return names.join(', ');
}


function output_function_graph(nodes, fingerprints)
{
	let output = ['digraph functiongraph'];

	output.push('{');

	nodes.forEach(function(node)
	{
		let count = 0;

		node.get_edges().forEach(function(edge)
		{
			count++;
			output.push('\t"' + node.get_data() + '" -> "' + edge.get_to().get_data() + '" [label="' + edge_name( edge.get_type(), fingerprints ) + '"];');
		});

		if(count == 0)
		{
			// Disconnected node
			output.push('\t"' + node.get_data() + '"');
		}
	});

	output.push('}');

	return output.join('\n');
}


function remove_constructed_edges(nodes, constructed_edge_value)
{
	nodes.forEach(function(node)
	{
		let index = 0;

		while(true)
		{
			let edges = node.get_edges();

			if(edges.length > index)
			{
				let edge = edges[index];

				// If the edge is of type CONSTRUCTED (thus not marked by any algorithm) remove it.
				if( edge.get_type() == constructed_edge_value )
				{
					node.disconnect( edge.get_to(), edge.get_type() );

					// We removed an edge, so edges.length will be one less than before.
					// Decrement index to keep the index count correct.
					index--;
				}else{
					// Remove the CONSTRUCTED type from this edge.
					edge.remove_type( constructed_edge_value );
				}

				// Consider next edge.
				index++;
			}else{
				// There are no more new edges available.
				break;
			}
		}
	});

	return nodes;
}


function traverse_graph(node, done)
{
	// For each child, recursively traverse them, and add each node to the list of traversed nodes.

	// First time around, done might not be initialized.
	if( !Array.isArray(done) )
	{
		done = [];
	}

	let traversed = [node],
	    edges = node.get_edges();

	for(let i = 0; i < edges.length; i++)
	{
		// We don't want infinite recursion for a <-> b nodes, so keep track where we've been.
		let stop = false;

		for(let j = 0; j < done.length; j++)
		{
			if( done[j].equals( edges[i].get_to() ) )
			{
				stop = true;
			}
		}

		if(stop)
		{
			continue;
		}

		done.push( edges[i].get_to() );

		// Traverse recursively.
		let child_traversed = traverse_graph( edges[i].get_to(), done );

		traversed = traversed.concat( child_traversed );
	}

	return traversed;
}


function get_disconnected_nodes(nodes)
{
	let disconnected_nodes = [],
	    base = get_base_caller_node(nodes);

	// Traverse the graph, starting from base.
	let connected_nodes = traverse_graph( base );

	nodes.forEach(function(node)
	{
		for(let i = 0; i < connected_nodes.length; i++)
		{
			if( connected_nodes[i].equals( node ) )
			{
				return;
			}
		}

		disconnected_nodes.push( node );
	});

	return disconnected_nodes;
}


function find_node(info, nodes)
{
	let i;

	for(i = 0; i < nodes.length; i++)
	{
		let node = nodes[i];
		let data = node.get_data();

		if( data.script_name == info.file &&
		    data.data.start == info.start &&
		    data.data.end == info.end)
		{
			return node;
		}
	}

	throw 'GraphTools exception: can\'t find node {file: ' + info.file + ', start: ' + info.start + ', end: ' + info.end + '}';
}


function mark(node_from, node_to, value)
{
	let i,
	    edges = node_from.get_edges();

	for(i = 0; i < edges.length; i++)
	{
		edge = edges[i];

		if( edge.get_to().equals( node_to ) )
		{
			edge.add_type( value.value );
		}
	}
}



module.exports =
{
	build_function_graph: build_function_graph,
	output_function_graph: output_function_graph,
	remove_constructed_edges: remove_constructed_edges,
	get_disconnected_nodes: get_disconnected_nodes,
	get_base_caller_node: get_base_caller_node,
	find_node: find_node,
	mark: mark
};
