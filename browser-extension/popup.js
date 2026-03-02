document.getElementById('extractBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = "Extracting...";
    statusDiv.style.color = "black";

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes("ya.ru") && !tab.url.includes("yandex.ru")) {
        statusDiv.textContent = "Error: Please open YA.RU search results.";
        statusDiv.style.color = "red";
        return;
    }

    // Inject script to extract data
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractSERPData,
    }, (results) => {
        if (chrome.runtime.lastError) {
            statusDiv.textContent = "Error: " + chrome.runtime.lastError.message;
            statusDiv.style.color = "red";
            return;
        }

        const data = results[0]?.result;

        if (!data || data.length === 0) {
            statusDiv.textContent = "No results found on page.";
            statusDiv.style.color = "red";
            return;
        }

        // Convert to JSON and copy to clipboard
        const jsonString = JSON.stringify(data, null, 2);

        // Copy using navigator
        navigator.clipboard.writeText(jsonString).then(() => {
            statusDiv.textContent = `Coppied ${data.length} items!`;
            statusDiv.style.color = "green";
        }).catch(err => {
            statusDiv.textContent = "Failed to copy: " + err;
            statusDiv.style.color = "red";
        });
    });
});

// This function is executed in the context of the webpage
function extractSERPData() {
    return new Promise(async (resolve) => {
        const _base64FromUrl = async (url) => {
            if (!url) return "";
            try {
                if (url.startsWith('//')) url = 'https:' + url;
                const res = await fetch(url);
                const blob = await res.blob();
                return new Promise((resBase64) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64data = reader.result.split(',')[1];
                        resBase64(base64data);
                    };
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                return "";
            }
        };

        // Use strict selector to target only organic text results, avoiding video carousels
        const items = Array.from(document.querySelectorAll('li.serp-item'))
            .filter(item => {
                // Ensure it's not a video or image carousel block by checking inner classes
                const isVideo = item.querySelector('.VideoSnippet, .serp-list_type_video');
                const isAd = item.querySelector('.label_type_ad, .Organic-Subtitle span[aria-label="Реклама"]');
                return !isVideo && !isAd;
            });

        const results = [];

        for (const item of items) {
            try {
                // Additional check to only process items that actually have the organic structure
                const titleNode = item.querySelector('.organic__title-wrapper, .OrganicTitle, h2');
                if (!titleNode) continue;

                const title = titleNode.innerText.trim();
                // Ignore empty titles or typical non-organic widget titles
                if (!title || title.length < 3) continue;

                const linkNode = item.querySelector('a.organic__url, a.Link, h2 a');
                const path = linkNode ? linkNode.href : "";

                // Extract breadcrumbs format "Host › Url"
                let siteName = "";
                let urlPath = "";
                const breadcrumbsNode = item.querySelector('.Path, .organic__subtitle, .Link-Desc, .Path-Item, div[aria-hidden="true"]');
                if (breadcrumbsNode) {
                    const parts = breadcrumbsNode.innerText.split('›').map(p => p.trim());
                    siteName = parts[0] || "";
                    if (parts.length > 1) {
                        urlPath = parts.slice(1).join('/');
                    }
                }

                if (!siteName) {
                    const siteNameNode = item.querySelector('.Path-Item, .organic__subtitle b, .Link b');
                    if (siteNameNode) siteName = siteNameNode.innerText.trim();
                }

                const contentNode = item.querySelector('.organic__content-wrapper, .TextContainer');
                const content = contentNode ? contentNode.innerText.trim() : "";

                // Yandex often changes class names. 
                // We expand the search to catch any image inside the typical organic header / favicon blocks
                const faviconNode = item.querySelector('img.favicon__icon, img.Favicon-Icon, .organic__title-wrapper img, .Path img, .Favicon img, .Favicon-Image');
                let faviconUrl = faviconNode ? faviconNode.src : "";

                // Sometimes Yandex uses background images for favicons
                if (!faviconUrl) {
                    const bgNode = item.querySelector('.favicon, .Favicon');
                    if (bgNode) {
                        const bgImg = window.getComputedStyle(bgNode).backgroundImage;
                        if (bgImg && bgImg.startsWith('url(')) {
                            faviconUrl = bgImg.slice(4, -1).replace(/["']/g, "");
                        }
                    }
                }

                let faviconBase64 = "";
                if (faviconUrl) {
                    faviconBase64 = await _base64FromUrl(faviconUrl);
                }

                // Ensure we only push items that look like actual search results (must have a link)
                if (path && siteName) {
                    results.push({
                        title,
                        path,
                        siteName,
                        urlPath,
                        content,
                        faviconBase64
                    });
                }
            } catch (e) {
                console.error("Extractor error on item", e);
            }
        }
        resolve(results);
    });
}
