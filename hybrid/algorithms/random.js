/*
	random
	Random algorithm for the 'hybrid' JDCE tool.

	Randomly connect nodes within the graph. This algorithm can be run multiple times, and will yield different outputs.
*/


const path = require('path'),
      Graph = require('../graph'),
      GraphTools = require('../graph_tools');



const CONNECT_CHANCE = 0.3,			// Chance (for each node) a node connects to another _random_ node.
      CONNECT_BASE_CHANCE = 0.1;	// Chance the base node connects to a node.



module.exports = function()
{
	this.run = function(settings, callback)
	{
		function random_node()
		{
			let index = Math.floor(Math.random() * settings.nodes.length);

			return settings.nodes[index];
		}

		settings.nodes.forEach(function(node)
		{
			// Connect to another random node (not base caller node).
			if( Math.random() < CONNECT_CHANCE )
			{
				GraphTools.mark( node, random_node(), settings.fingerprint );
			}

			// Connect base caller node to this node.
			if( Math.random() < CONNECT_BASE_CHANCE)
			{
				GraphTools.mark( settings.base_node,  node, settings.fingerprint);
			}
		});	

		callback();
	};
};
