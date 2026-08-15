export function splitResponseSections(
  text: string,
  defaultTitle: string
): { title: string; body: string }[] {
  const lines = text.split('\n');
  const sections: { title: string; body: string }[] = [];
  let currentTitle = defaultTitle;
  let currentLines: string[] = [];

  const flush = () => {
    const body = currentLines.join('\n').trim();
    if (body) {
      sections.push({ title: currentTitle, body });
    }
    currentLines = [];
  };

  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+)$/) || line.match(/^(\d+\.\s+[A-Z][^:]{0,60}:?)$/);
    if (heading) {
      flush();
      currentTitle = heading[1].replace(/:$/, '').trim();
      continue;
    }
    currentLines.push(line);
  }

  flush();

  if (sections.length === 0) {
    return [{ title: defaultTitle, body: text.trim() }];
  }

  return sections;
}
