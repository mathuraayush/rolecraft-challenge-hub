import axios from "axios";
import {ApiError} from "../utils/ApiError.js";

/**
 * Fetch content from GitHub repository
 * @param {String} url - GitHub repository URL
 * @returns {Object} { content, filesReviewed, accessible }
 */
export const fetchGithubContent = async (url) => {
  try {
    // Parse GitHub URL: https://github.com/user/repo
    const match = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
    if (!match) {
      throw new Error("Invalid GitHub URL format");
    }

    const [, owner, repo] = match;
    const repoClean = repo.replace(/\.git$/, "");
    const apiUrl = `https://api.github.com/repos/${owner}/${repoClean}`;

    // Fetch repo metadata
    const repoResponse = await axios.get(apiUrl, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        }),
      },
      timeout: 5000,
    });

    // Fetch README
    let readmeContent = "";
    try {
      const readmeResponse = await axios.get(
        `${apiUrl}/readme`,
        {
          headers: {
            Accept: "application/vnd.github.v3.raw",
            ...(process.env.GITHUB_TOKEN && {
              Authorization: `token ${process.env.GITHUB_TOKEN}`,
            }),
          },
          timeout: 5000,
        }
      );
      readmeContent = readmeResponse.data.substring(0, 2000);
    } catch (e) {
      // README not found, continue
    }

    // Fetch tree structure (files) with code extensions
    let filesContent = "";
    const codeExtensions = ['.js', '.ts', '.py', '.java', '.cpp', '.jsx', '.tsx', '.sql', '.html', '.css', '.go', '.rs', '.php', '.ipynb', '.md'];
    
    try {
      const treeResponse = await axios.get(
        `${apiUrl}/git/trees/HEAD?recursive=1`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            ...(process.env.GITHUB_TOKEN && {
              Authorization: `token ${process.env.GITHUB_TOKEN}`,
            }),
          },
          timeout: 5000,
        }
      );

      if (!treeResponse.data.tree) throw new Error("No tree data");

      const codeFiles = treeResponse.data.tree
        .filter((f) => f.type === "blob" && codeExtensions.some((ext) => f.path.endsWith(ext)))
        .filter((f) => !f.path.includes('node_modules') && !f.path.includes('.min.'))
        .slice(0, 10);

      // Fetch file contents
      const filePromises = codeFiles.map(async (file) => {
        try {
          const fileRes = await axios.get(`${apiUrl}/contents/${file.path}`, {
            headers: {
              Accept: "application/vnd.github.v3.raw",
              ...(process.env.GITHUB_TOKEN && { Authorization: `token ${process.env.GITHUB_TOKEN}` }),
            },
            timeout: 3000,
          });
          return `\n--- ${file.path} ---\n${fileRes.data.substring(0, 500)}`;
        } catch (e) {
          return `\n--- ${file.path} --- [inaccessible]`;
        }
      });
      
      const fileContents = await Promise.all(filePromises);
      filesContent = fileContents.join("").substring(0, 8000);
    } catch (e) {
      filesContent = "[Tree/files could not be fetched]";
    }

    const content = `
Repository: ${repoResponse.data.full_name}
Description: ${repoResponse.data.description || "N/A"}
Language: ${repoResponse.data.language || "N/A"}
Stars: ${repoResponse.data.stargazers_count}

README:
${readmeContent}

Files:
${filesContent}
`.substring(0, 12000);

    return {
      content,
      filesReviewed: [repoResponse.data.full_name],
      accessible: true,
    };
  } catch (error) {
    console.error("GitHub fetch error:", error.message);
    throw new ApiError(400, `Failed to fetch GitHub content: ${error.message}`);
  }
};

/**
 * Fetch content from Google Docs
 * @param {String} url - Google Docs URL
 * @returns {Object} { content, filesReviewed, accessible }
 */
export const fetchGoogleDocContent = async (url) => {
  try {
    // Extract doc ID from URL
    // Format: https://docs.google.com/document/d/{ID}/edit
    const match = url.match(/\/document\/d\/([^\/]+)/);
    if (!match) {
      throw new Error("Invalid Google Docs URL format");
    }

    const docId = match[1];

    // Export as plain text using export URL
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

    const response = await axios.get(exportUrl, {
      timeout: 5000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const content = response.data.substring(0, 5000);

    return {
      content,
      filesReviewed: [`Google Doc: ${docId}`],
      accessible: true,
    };
  } catch (error) {
    console.error("Google Docs fetch error:", error.message);
    if (error.response?.status === 403 || error.response?.status === 404) {
      return {
        content: "[Document is not accessible or does not exist]",
        filesReviewed: [],
        accessible: false,
      };
    }
    throw new ApiError(
      400,
      `Failed to fetch Google Docs content: ${error.message}`
    );
  }
};

/**
 * Fetch content from Notion page
 * @param {String} url - Notion page URL
 * @returns {Object} { content, filesReviewed, accessible }
 */
export const fetchNotionContent = async (url) => {
  try {
    // Try to use Firecrawl API for scraping
    if (!process.env.FIRECRAWL_API_KEY) {
      // Fallback: extract page title from URL
      const titleMatch = url.match(/notion\.so\/([^?]+)/);
      const title = titleMatch ? titleMatch[1].replace(/-/g, " ") : "Notion Page";

      return {
        content: `[Notion Page: ${title}]\n\nNote: Full content requires Firecrawl API key for scraping. Please configure FIRECRAWL_API_KEY in environment variables.`,
        filesReviewed: [url],
        accessible: false,
      };
    }

    const firecrawlResponse = await axios.post(
      "https://api.firecrawl.dev/v1/scrape",
      {
        url,
        pageOptions: {
          onlyMainContent: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        },
        timeout: 10000,
      }
    );

    const content = firecrawlResponse.data.markdown?.substring(0, 5000) || 
                   firecrawlResponse.data.content?.substring(0, 5000) ||
                   "[Notion page content could not be extracted]";

    return {
      content,
      filesReviewed: [url],
      accessible: true,
    };
  } catch (error) {
    console.error("Notion fetch error:", error.message);

    // Return partial accessible response for Notion
    const titleMatch = url.match(/notion\.so\/([^?]+)/);
    const title = titleMatch ? titleMatch[1].replace(/-/g, " ") : "Notion Page";

    return {
      content: `[Notion Page: ${title}]\n\n[Full content scraping requires Firecrawl API. Partial content available.]`,
      filesReviewed: [url],
      accessible: false,
    };
  }
};

/**
 * Fetch content from Figma design file
 * @param {String} url - Figma URL
 * @returns {Object} { content, filesReviewed, accessible }
 */
export const fetchFigmaContent = async (url) => {
  try {
    // Validate Figma URL format
    if (!url.includes("figma.com")) {
      throw new Error("Invalid Figma URL");
    }

    // Extract file ID from URL: https://www.figma.com/file/{FILE_ID}/...
    const match = url.match(/\/file\/([^\/\?#]+)/);
    if (!match) {
      throw new Error("Could not extract Figma file ID");
    }

    const fileId = match[1];

    // With Figma token: Can access public AND private files
    // Get token from: https://www.figma.com/developers/api#access-tokens
    // Settings → Develop → Personal access tokens → Create new token
    if (process.env.FIGMA_API_TOKEN) {
      try {
        const figmaResponse = await axios.get(
          `https://api.figma.com/v1/files/${fileId}`,
          {
            headers: {
              "X-Figma-Token": process.env.FIGMA_API_TOKEN,
            },
            timeout: 5000,
          }
        );

        const fileData = figmaResponse.data;
        const pages = fileData.document.children
          .map((page) => `- ${page.name}`)
          .join("\n")
          .substring(0, 1000);

        const content = `Figma File: ${fileData.name}\nLast Modified: ${fileData.lastModified}\nPages: ${fileData.document.children.length}\n\n${pages}`;

        return {
          content,
          filesReviewed: [fileData.name],
          accessible: true,
        };
      } catch (e) {
        // Token invalid or file not found
        return {
          content: `[Figma file not accessible with provided token]`,
          filesReviewed: [url],
          accessible: false,
        };
      }
    } else {
      // Without token: Can only validate URL format for public files
      return {
        content: `[Figma Design File]\nFile ID: ${fileId}\n\nNote: For detailed analysis, set FIGMA_API_TOKEN in environment variables.\nGet token: https://www.figma.com/developers/api#access-tokens`,
        filesReviewed: [url],
        accessible: false,
      };
    }
  } catch (error) {
    console.error("Figma fetch error:", error.message);
    // Return accessible response instead of throwing
    const match = url.match(/\/file\/([^\/\?#]+)/);
    return {
      content: `[Figma file could not be fetched: ${error.message}]`,
      filesReviewed: match ? [match[1]] : [url],
      accessible: false,
    };
  }
};

/**
 * Detect submission type from URL
 * @param {String} url - Submission URL
 * @returns {String} Submission type (github, gdoc, notion, figma, other)
 */
export const detectSubmissionType = (url) => {
  if (!url) return "other";

  const urlLower = url.toLowerCase();

  if (urlLower.includes("github.com")) return "github";
  if (urlLower.includes("docs.google.com")) return "gdoc";
  if (urlLower.includes("notion.so")) return "notion";
  if (urlLower.includes("figma.com")) return "figma";

  return "other";
};

/**
 * Validate submission URL
 * @param {String} url - Submission URL
 * @param {String} type - Submission type
 * @returns {Boolean} True if URL format is valid
 */
export const isValidSubmissionUrl = (url, type) => {
  if (!url) return false;

  switch (type) {
    case "github":
      return /github\.com\/[^\/]+\/[^\/]+/.test(url);
    case "gdoc":
      return /docs\.google\.com\/document\/d\/[^\/]+/.test(url);
    case "notion":
      return /notion\.so/.test(url);
    case "figma":
      return /figma\.com\/file/.test(url);
    default:
      return /^https?:\/\//.test(url);
  }
};
