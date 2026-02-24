import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import { uid } from '@/lib/utils';
import { NODE_DEFINITIONS } from '@/lib/node-types';

const useFlowStore = create((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,

  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },

  onConnect: (connection) => {
    set((state) => ({
      edges: addEdge(
        {
          ...connection,
          id: `e-${uid()}`,
          animated: true,
        },
        state.edges
      ),
    }));
  },

  addNode: (type, position) => {
    const definition = NODE_DEFINITIONS[type];
    if (!definition) {
      console.warn(`Unknown node type: ${type}`);
      return null;
    }

    const id = `node-${uid()}`;
    const node = {
      id,
      type,
      position,
      data: { ...definition.defaultData },
    };

    set((state) => ({
      nodes: [...state.nodes, node],
      selectedNodeId: id,
    }));

    return node;
  },

  removeNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter(
        (e) => e.source !== id && e.target !== id
      ),
      selectedNodeId:
        state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },

  setSelectedNode: (id) => {
    set({ selectedNodeId: id });
  },

  updateNodeData: (id, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    }));
  },
}));

export default useFlowStore;
