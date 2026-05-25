"use client";
// ═══════════════════════════════════════════════════════════════
// INIXA VIBE CODE — File Tree Component
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, FilePlus, FolderPlus, Trash2 } from 'lucide-react';
import { VirtualFileSystem, type VFSNode, normalizePath } from '../../api/vibeFileSystem';

interface Props {
  vfs: VirtualFileSystem;
  activeFile?: string;
  onFileSelect: (path: string) => void;
  treeVersion: number;
}

// File icon colors by extension
const FILE_COLORS: Record<string, string> = {
  ts: '#3178c6', tsx: '#3178c6', js: '#f7df1e', jsx: '#61dafb',
  py: '#3776ab', rb: '#cc342d', go: '#00add8', rs: '#dea584',
  html: '#e34f26', css: '#1572b6', scss: '#cc6699', json: '#a8a8a8',
  md: '#ffffff', yaml: '#cb171e', yml: '#cb171e', toml: '#9c4121',
  sql: '#e38c00', sh: '#89e051', dockerfile: '#2496ed',
  svg: '#ffb13b', vue: '#42b883', svelte: '#ff3e00',
  graphql: '#e10098', prisma: '#2d3748', env: '#ecd53f',
};

function getFileColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return FILE_COLORS[ext] || '#8b949e';
}

function TreeNode({ node, depth, activeFile, onFileSelect, vfs }: {
  node: VFSNode; depth: number; activeFile?: string;
  onFileSelect: (path: string) => void; vfs: VirtualFileSystem;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (node.type === 'file') {
    const isActive = node.path === activeFile;
    return (
      <button
        className={`vibe-tree-item ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => onFileSelect(node.path)}
        title={node.path}
      >
        <File size={14} style={{ color: getFileColor(node.name), flexShrink: 0 }} />
        <span className="vibe-tree-name">{node.name}</span>
      </button>
    );
  }

  return (
    <div className="vibe-tree-dir">
      <button
        className="vibe-tree-item dir"
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {expanded ? <FolderOpen size={14} className="text-indigo-400" /> : <Folder size={14} className="text-indigo-400" />}
        <span className="vibe-tree-name">{node.name}</span>
      </button>
      {expanded && node.children && (
        <div className="vibe-tree-children">
          {node.children.map(child => (
            <TreeNode key={child.path} node={child} depth={depth + 1} activeFile={activeFile} onFileSelect={onFileSelect} vfs={vfs} />
          ))}
        </div>
      )}
    </div>
  );
}

export function VibeFileTree({ vfs, activeFile, onFileSelect, treeVersion }: Props) {
  const tree = vfs.getTree();
  const stats = vfs.getStats();

  const handleNewFile = () => {
    const path = prompt('File path (e.g. /src/app.ts):');
    if (path) {
      vfs.writeFile(path, '');
      onFileSelect(normalizePath(path));
    }
  };

  const handleNewFolder = () => {
    const path = prompt('Folder path (e.g. /src/components):');
    if (path) vfs.mkdir(path);
  };

  return (
    <div className="vibe-file-tree">
      <div className="vibe-tree-header">
        <span className="vibe-tree-title">FILES</span>
        <div className="vibe-tree-actions">
          <button className="vibe-btn-icon tiny" onClick={handleNewFile} title="New File">
            <FilePlus size={13} />
          </button>
          <button className="vibe-btn-icon tiny" onClick={handleNewFolder} title="New Folder">
            <FolderPlus size={13} />
          </button>
        </div>
      </div>
      <div className="vibe-tree-content">
        {tree.children && tree.children.length > 0 ? (
          tree.children.map(child => (
            <TreeNode key={child.path} node={child} depth={0} activeFile={activeFile} onFileSelect={onFileSelect} vfs={vfs} />
          ))
        ) : (
          <div className="vibe-tree-empty">
            <p>No files yet</p>
            <p className="sub">Ask AI to create a project or add files manually</p>
          </div>
        )}
      </div>
      <div className="vibe-tree-footer">
        <span>{stats.files} files · {stats.dirs} dirs</span>
      </div>
    </div>
  );
}

