export class ToolOrganizer {
  static organizeByCategory(tools: any[]) {
    const categories: Record<string, any[]> = {};
    
    tools.forEach(tool => {
      // Extract category from tool name or description
      const category = this.extractCategory(tool);
      
      if (!categories[category]) {
        categories[category] = [];
      }
      
      categories[category].push(tool);
    });
    
    return categories;
  }
  
  private static extractCategory(tool: any): string {
    // Try to extract category from tool name
    if (tool.name) {
      if (tool.name.includes('channel') || tool.name.includes('category')) {
        return 'Channel Management';
      }
      if (tool.name.includes('message')) {
        return 'Message Management';
      }
      if (tool.name.includes('role')) {
        return 'Role Management';
      }
      if (tool.name.includes('member')) {
        return 'Member Management';
      }
      if (tool.name.includes('voice') || tool.name.includes('audio')) {
        return 'Voice & Audio';
      }
      if (tool.name.includes('server')) {
        return 'Server Management';
      }
      if (tool.name.includes('event')) {
        return 'Event Management';
      }
      if (tool.name.includes('invite')) {
        return 'Invite Management';
      }
      if (tool.name.includes('emoji') || tool.name.includes('sticker')) {
        return 'Emoji & Sticker';
      }
      if (tool.name.includes('webhook')) {
        return 'Webhook Management';
      }
      if (tool.name.includes('automod')) {
        return 'Automod';
      }
    }
    
    // Default category
    return 'Other';
  }
  
  static sortToolsAlphabetically(tools: any[]): any[] {
    return tools.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
  }
  
  static filterToolsByPermission(tools: any[], requiredPermissions: string[]): any[] {
    // In a real implementation, this would check tool requirements against bot permissions
    // For now, we'll return all tools
    return tools;
  }
}