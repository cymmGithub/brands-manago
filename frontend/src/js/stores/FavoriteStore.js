/**
 * Favorite Store - Manages favorite products using localStorage
 */
const FavoriteStore = (() => {
	// Private variables
	const STORAGE_KEY = 'formasint-favorites';

	// Private methods
	function getFavoritesFromStorage() {
		try {
			return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
		} catch (_error) {
			return [];
		}
	}

	function saveFavoritesToStorage(favorites) {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
		} catch (_error) {
			// Silent fail
		}
	}

	// Public controller
	const controller = {
		// Get all favorites
		getFavorites() {
			return getFavoritesFromStorage();
		},

		// Check if product is favorite
		isFavorite(productId) {
			const favorites = getFavoritesFromStorage();
			return favorites.includes(productId);
		},

		// Add to favorites
		addFavorite(productId) {
			const favorites = getFavoritesFromStorage();
			if (!favorites.includes(productId)) {
				favorites.push(productId);
				saveFavoritesToStorage(favorites);
			}
		},

		// Remove from favorites
		removeFavorite(productId) {
			const favorites = getFavoritesFromStorage();
			const index = favorites.indexOf(productId);
			if (index > -1) {
				favorites.splice(index, 1);
				saveFavoritesToStorage(favorites);
			}
		},

		// Toggle favorite status
		toggleFavorite(productId) {
			if (controller.isFavorite(productId)) {
				controller.removeFavorite(productId);
				return false;
			} else {
				controller.addFavorite(productId);
				return true;
			}
		},

		// Clear all favorites
		clearAll() {
			saveFavoritesToStorage([]);
		},
	};

	return controller;
})();
