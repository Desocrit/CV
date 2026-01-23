import { marked } from 'marked';

// Configure marked for terminal output
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
});

export { marked };
