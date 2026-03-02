from flask import Flask, request, jsonify
from flask_cors import CORS
from playwright.sync_api import sync_playwright
import base64
import requests

app = Flask(__name__)
CORS(app)

def fetch_image_as_base64(url):
    try:
        if url.startswith('//'):
            url = 'https:' + url
        headers = {'User-Agent': 'Mozilla/5.0'}
        res = requests.get(url, headers=headers, timeout=5)
        res.raise_for_status()
        return base64.b64encode(res.content).decode('utf-8')
    except Exception:
        return ""

@app.route('/search', methods=['GET'])
def search():
    url = request.args.get('url')
    if not url:
        return jsonify({'error': 'URL is required'}), 400

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
                locale="ru-RU"
            )
            page = context.new_page()
            
            page.goto(url, wait_until="domcontentloaded", timeout=15000)
            
            # Captcha check
            if "captcha" in page.url.lower() or "showcaptcha" in page.url.lower() or "верификация" in page.title().lower():
                browser.close()
                return jsonify({'error': 'Yandex blocked the request with a captcha. Please try from a browser first or use non-headless mode.'}), 403
            
            # Wait for organic results
            try:
                page.wait_for_selector('.serp-item, .Organic', timeout=5000)
            except Exception:
                pass
            
            html_content = page.content()
            items = page.locator('.serp-item, .Organic').all()
            
            results = []
            for item in items:
                try:
                    title_loc = item.locator('.organic__title-wrapper, .OrganicTitle, h2').first
                    if not title_loc.is_visible(): continue
                    title = title_loc.inner_text().strip()
                    
                    link_loc = item.locator('a.organic__url, a.Link, h2 a').first
                    path = link_loc.get_attribute('href')
                    if not path: continue
                    
                    content_loc = item.locator('.organic__content-wrapper, .TextContainer').first
                    content = content_loc.inner_text().strip() if content_loc.is_visible() else ""
                    
                    favicon_loc = item.locator('img.favicon__icon, img.Favicon-Icon, img').first
                    favicon_url = favicon_loc.get_attribute('src') if favicon_loc.is_visible() else ""
                    
                    favicon_base64 = fetch_image_as_base64(favicon_url) if favicon_url else ""
                    
                    results.append({
                        'title': title,
                        'path': path,
                        'content': content,
                        'faviconBase64': favicon_base64
                    })
                except Exception as e:
                    print("Error parsing item:", e)
                    continue
            
            browser.close()
            
            if results:
                return jsonify({'results': results})
            else:
                return jsonify({
                    'error': 'No organic results found on the page.', 
                    'html_snippet': html_content[:500]
                }), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=3000, debug=True)
