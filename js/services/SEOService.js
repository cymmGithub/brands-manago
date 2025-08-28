/**
 * SEO Service - SEO management following Google's recommendations
 * https://developers.google.com/search/docs/fundamentals/seo-starter-guide
 */
const SEOService = (() => {
	// SEO data for different sections/pages
	const seoData = {
		home: {
			title: "Forma'Sint - Premium Outdoor Gear & Professional Climbing Equipment",
			description: "Discover premium outdoor gear and climbing equipment at Forma'Sint. Shop featured products, limited editions, and professional gear for extreme adventures.",
		},
		featured: {
			title: "Featured Products - Premium Outdoor Gear | Forma'Sint",
			description: 'Explore our featured collection of premium outdoor gear. Bestsellers and limited edition climbing equipment for professional mountaineers.',
		},
		products: {
			title: "All Products - Outdoor Gear Collection | Forma'Sint",
			description: 'Browse our complete collection of outdoor gear and climbing equipment. Professional-grade products for serious adventurers and mountaineers.',
		},
		product: {
			title: "{{productName}} - Premium Outdoor Gear | Forma'Sint",
			description: "{{productDescription}} Premium quality outdoor gear from Forma'Sint. Professional equipment for serious climbers and adventurers.",
		},
	};

	// Private methods - Core SEO elements only
	function updateTitle(title) {
		document.title = title;
	}

	function updateMetaDescription(description) {
		let metaDesc = document.querySelector('meta[name="description"]');
		if (!metaDesc) {
			metaDesc = document.createElement('meta');
			metaDesc.setAttribute('name', 'description');
			document.head.appendChild(metaDesc);
		}
		metaDesc.setAttribute('content', description);
	}

	function updateCanonicalUrl(url) {
		let canonical = document.querySelector('link[rel="canonical"]');
		if (!canonical) {
			canonical = document.createElement('link');
			canonical.setAttribute('rel', 'canonical');
			document.head.appendChild(canonical);
		}
		canonical.setAttribute('href', url);
	}

	function updateBasicOpenGraph(data) {
		// Only essential Open Graph tags for social sharing
		const ogTags = {
			'og:title': data.title,
			'og:description': data.description,
			'og:url': window.location.href,
			'og:image': window.location.origin + '/assets/images/hero-climber.jpg',
		};

		Object.entries(ogTags).forEach(([property, content]) => {
			let tag = document.querySelector(`meta[property="${property}"]`);
			if (!tag) {
				tag = document.createElement('meta');
				tag.setAttribute('property', property);
				document.head.appendChild(tag);
			}
			tag.setAttribute('content', content);
		});
	}

	function interpolateTemplate(template, data = {}) {
		return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
			return data[key] || match;
		});
	}

	// Public controller
	const controller = {
		// Update SEO for a specific section - simplified approach
		updateSEO(section, data = {}) {
			const sectionData = seoData[section];
			if (!sectionData) {
				console.warn(`SEO data not found for section: ${section}`);
				return;
			}

			// Interpolate templates with dynamic data
			const title = interpolateTemplate(sectionData.title, data);
			const description = interpolateTemplate(sectionData.description, data);

			// Update core SEO elements (what Google actually cares about)
			updateTitle(title);
			updateMetaDescription(description);
			updateCanonicalUrl(window.location.href);
			updateBasicOpenGraph({title, description});
		},

		// Update SEO for product page
		updateProductSEO(productData) {
			this.updateSEO('product', {
				productName: productData.title || productData.name,
				productDescription: productData.description || `Premium ${productData.title || 'outdoor gear'}.`,
			});
		},

		// Initialize SEO service - simplified
		init() {
			// Set initial SEO
			this.updateSEO('home');

			// Only listen for hash changes (simple navigation)
			window.addEventListener('hashchange', () => {
				const hash = window.location.hash.slice(1); // Remove #
				if (seoData[hash]) {
					this.updateSEO(hash);
				}
			});
		},

		// Add new SEO data for custom sections
		addSEOData(section, data) {
			seoData[section] = data;
		},

		// Simple structured data for products (when needed)
		addProductStructuredData(productData) {
			const script = document.createElement('script');
			script.type = 'application/ld+json';
			script.textContent = JSON.stringify({
				'@context': 'https://schema.org/',
				'@type': 'Product',
				name: productData.name,
				description: productData.description,
				brand: {
					'@type': 'Brand',
					name: "Forma'Sint",
				},
			});
			document.head.appendChild(script);
		},
	};

	return controller;
})();
