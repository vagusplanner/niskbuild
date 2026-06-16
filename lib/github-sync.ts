export type GitHubFilePayload = {
  path: string;
  content: string;
};

type GitHubContentResponse = {
  sha?: string;
};

async function getFileSha(
  repo: string,
  path: string,
  token: string
): Promise<string | undefined> {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${encodedPath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (res.status === 404) return undefined;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub read failed for ${path} (${res.status})${text ? `: ${text.slice(0, 120)}` : ''}`);
  }

  const data = (await res.json()) as GitHubContentResponse;
  return data.sha;
}

async function upsertFile(
  repo: string,
  file: GitHubFilePayload,
  token: string,
  commitMessage: string
): Promise<void> {
  const sha = await getFileSha(repo, file.path, token);
  const encodedPath = file.path.split('/').map(encodeURIComponent).join('/');

  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${encodedPath}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      message: commitMessage,
      content: Buffer.from(file.content, 'utf8').toString('base64'),
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub push failed for ${file.path} (${res.status})${text ? `: ${text.slice(0, 160)}` : ''}`);
  }
}

export async function pushFilesToGitHub(params: {
  repo: string;
  token: string;
  files: GitHubFilePayload[];
  commitMessage: string;
}): Promise<{ commitUrl: string }> {
  const { repo, token, files, commitMessage } = params;

  if (!repo.includes('/')) {
    throw new Error('Repository must be in owner/name format');
  }

  if (files.length === 0) {
    throw new Error('No files to sync');
  }

  for (const file of files) {
    if (!file.path?.trim()) {
      throw new Error('Each file must have a path');
    }
    await upsertFile(repo, file, token, commitMessage);
  }

  const [owner, name] = repo.split('/');
  return {
    commitUrl: `https://github.com/${owner}/${name}`,
  };
}

export type GitHubRepoSummary = {
  id: number;
  full_name: string;
  private: boolean;
};

export async function listGitHubRepos(token: string): Promise<GitHubRepoSummary[]> {
  const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to list repositories (${res.status})${text ? `: ${text.slice(0, 120)}` : ''}`);
  }

  const data = (await res.json()) as GitHubRepoSummary[];
  return Array.isArray(data) ? data : [];
}
