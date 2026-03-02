figma.showUI(__html__, { width: 340, height: 280 });

figma.ui.onmessage = async (msg) => {
    if (msg.type === 'fill-data') {
        const { results } = msg;

        const selection = figma.currentPage.selection;
        if (selection.length === 0) {
            figma.notify("Please select at least one 'Block / Snippet' component instance.");
            return;
        }

        // Preload fonts for text nodes
        for (const node of selection) {
            if (!node.findAll) continue;
            const textNodes = node.findAll(n => n.type === "TEXT");
            for (const textNode of textNodes) {
                if (!textNode.hasMissingFont && textNode.fontName !== figma.mixed) {
                    try { await figma.loadFontAsync(textNode.fontName); } catch (e) { }
                }
            }
        }

        const fillNestedTextByName = (rootNode, targetName, textValue) => {
            const wrapperNode = rootNode.findOne(n => n.name.includes(targetName));
            if (!wrapperNode) return false;

            if (wrapperNode.type === 'TEXT') {
                wrapperNode.characters = textValue;
                return true;
            }

            if (wrapperNode.findOne) {
                const innerText = wrapperNode.findOne(n => n.type === 'TEXT');
                if (innerText) {
                    innerText.characters = textValue;
                    return true;
                }
            }
            return false;
        };

        let filledCount = 0;

        for (let i = 0; i < selection.length; i++) {
            const originalNode = selection[i];
            const data = results[i];

            if (!data) break;

            // We no longer detach the main instance so components remain intact
            let node = originalNode;


            // 1. Organic Title
            if (data.title) fillNestedTextByName(node, 'OrganicTitle', data.title);

            // 2. Organic Content
            if (data.content) fillNestedTextByName(node, 'OrganicContent', data.content);

            // 3. Path (Host, Separator, Url)
            const pathWrapper = node.findOne(n => n.name.includes('Path'));
            if (pathWrapper && pathWrapper.findOne) {
                const hostNode = pathWrapper.findOne(n => n.name === 'Host' && n.type === 'TEXT');
                const urlNode = pathWrapper.findOne(n => n.name === 'Url' && n.type === 'TEXT');
                const separatorNode = pathWrapper.findOne(n => n.name === 'Separator');

                let rawHost = data.siteName || data.path || "";
                let rawUrl = data.urlPath || "";

                // Aggressive fallback splitting inside Figma!
                if (rawHost.includes('›')) {
                    const parts = rawHost.split('›').map(p => p.trim());
                    rawHost = parts[0];
                    if (!rawUrl) rawUrl = parts.slice(1).join('/');
                }

                if (rawHost.includes('>')) {
                    const parts = rawHost.split('>').map(p => p.trim());
                    rawHost = parts[0];
                    if (!rawUrl) rawUrl = parts.slice(1).join('/');
                }

                if (hostNode) hostNode.characters = rawHost.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];

                if (urlNode) {
                    try { rawUrl = decodeURI(rawUrl); } catch (e) { }
                    urlNode.characters = rawUrl.replace(/\/$/, '');

                    if (urlNode.characters === "") {
                        urlNode.visible = false;
                        if (separatorNode) separatorNode.visible = false;
                    } else {
                        urlNode.visible = true;
                        if (separatorNode) separatorNode.visible = true;
                    }
                }
            }

            // 4. Favicon
            if (data.faviconBytes) {
                try {
                    const bytesArray = data.faviconBytes instanceof Uint8Array
                        ? data.faviconBytes
                        : new Uint8Array(Object.values(data.faviconBytes));

                    const image = figma.createImage(bytesArray);

                    let replacedImage = false;
                    // Find instances containing 'favicon' (case-insensitive)
                    const faviconWrappers = node.findAll ? node.findAll(n => n.name.toLowerCase().includes('favicon')) : [];

                    // Traverse innermost backwards to outermost
                    for (let j = faviconWrappers.length - 1; j >= 0; j--) {
                        const wrapper = faviconWrappers[j];

                        // Attempt to swap component to "placeholder" variant if it's a variant set
                        if (wrapper.type === 'INSTANCE' && wrapper.mainComponent) {
                            try {
                                const parent = wrapper.mainComponent.parent;
                                if (parent && parent.type === 'COMPONENT_SET') {
                                    const placeholderVariant = parent.children.find(c => c.name.toLowerCase().includes('placeholder'));

                                    if (placeholderVariant) {
                                        const variantNameParts = placeholderVariant.name.split(',');
                                        const propsToSet = {};

                                        for (const part of variantNameParts) {
                                            const [propName, propValue] = part.split('=');
                                            if (propName && propValue) {
                                                propsToSet[propName.trim()] = propValue.trim();
                                            }
                                        }

                                        if (Object.keys(propsToSet).length > 0) {
                                            try { wrapper.setProperties(propsToSet); }
                                            catch (e) { wrapper.swapComponent(placeholderVariant); }
                                        } else {
                                            wrapper.swapComponent(placeholderVariant);
                                        }
                                    }
                                }
                            } catch (e) {
                                console.log("Failed to swap variant:", e);
                            }
                        }

                        // We now directly target the wrapper itself (e.g. "Source / Icon / Favicon")
                        try {
                            if ('fills' in wrapper) {
                                // Important: We MUST clone the fills before modifying if we want to ensure Figma sees it
                                // But usually directly assigning a new array works for overrides
                                wrapper.fills = [{
                                    type: 'IMAGE',
                                    scaleMode: 'FILL',
                                    imageHash: image.hash
                                }];
                                replacedImage = true;
                                console.log(`Successfully replaced image fill on wrapper: "${wrapper.name}"`);
                                break; // Stop after first successful replacement
                            }
                        } catch (e) {
                            console.log("Failed to swap fills:", e);
                        }
                    }

                    if (!replacedImage) {
                        try {
                            // Outermost fallback: Just find the word favicon and force it
                            const veryFallback = node.findOne ? node.findOne(n => n.name.toLowerCase().includes('favicon')) : null;
                            if (veryFallback && 'fills' in veryFallback) {
                                veryFallback.fills = [{
                                    type: 'IMAGE',
                                    scaleMode: 'FILL',
                                    imageHash: image.hash
                                }];
                            } else {
                                const fbImgNode = node.findOne ? node.findOne(n => n.name.toLowerCase() === 'image') : null;
                                if (fbImgNode && 'fills' in fbImgNode) {
                                    fbImgNode.fills = [{
                                        type: 'IMAGE',
                                        scaleMode: 'FILL',
                                        imageHash: image.hash
                                    }];
                                } else {
                                    console.error("Could not find a fillable layer for favicon");
                                }
                            }
                        } catch (e) {
                            console.error("Complete fallback failed:", e);
                        }
                    }
                } catch (e) {
                    console.error("Failed to set favicon image:", e);
                }
            }
            filledCount++;
        }

        figma.notify(`Successfully filled ${filledCount} snippet(s)!`);
    }
};
