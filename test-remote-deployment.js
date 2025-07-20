#!/usr/bin/env node

import { spawn } from 'child_process';

async function testRemoteDeployment() {
    console.log('Testing remote deployment...');
    
    const mcpProcess = spawn('npx', ['-y', 'mcp-remote', 'https://discord-mcp-2blb1.sevalla.app'], {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    const initRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
            protocolVersion: "2024-11-05",
            capabilities: { roots: { listChanged: true } },
            clientInfo: { name: "test-client", version: "1.0.0" }
        }
    };

    setTimeout(() => {
        console.log('Sending initialize...');
        mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');
    }, 2000);

    mcpProcess.stdout.on('data', (data) => {
        console.log('STDOUT:', data.toString());
    });

    mcpProcess.stderr.on('data', (data) => {
        console.log('STDERR:', data.toString());
    });

    mcpProcess.on('close', (code) => {
        console.log(`Process exited with code ${code}`);
    });

    setTimeout(() => {
        const toolsRequest = {
            jsonrpc: "2.0",
            id: 2,
            method: "tools/list"
        };
        console.log('Sending tools/list...');
        mcpProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');
        
        setTimeout(() => mcpProcess.kill(), 3000);
    }, 5000);
}

testRemoteDeployment().catch(console.error);