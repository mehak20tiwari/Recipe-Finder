class RecipeFinder {
  constructor() {
    this.currentTab = 'search';
    this.currentSection = 'home';
    this.searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
    this.favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    this.categories = [];
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSearchHistory();
    this.loadFavorites();
    this.loadCategories();
    this.handleEnterKey();
    this.updateFavoritesCount();
    this.initNavbar();
  }

  bindEvents() {
    // Search functionality
    document.getElementById('search-btn').addEventListener('click', () => this.searchRecipes());
    
    // Tab switching (within search section)
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Modal events
    document.querySelector('.close').addEventListener('click', () => this.closeModal());
    document.getElementById('recipe-modal').addEventListener('click', (e) => {
      if (e.target.id === 'recipe-modal') this.closeModal();
    });

    // Search history clicks
    document.getElementById('search-history').addEventListener('click', (e) => {
      if (e.target.classList.contains('history-item')) {
        document.getElementById('search-input').value = e.target.textContent;
        this.searchRecipes();
      }
    });

    // Navbar links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.target.closest('.nav-link').dataset.section;
        this.switchSection(section);
      });
    });
  }

  initNavbar() {
    // Mobile menu toggle
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');

    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      navToggle.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');
      });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');
      }
    });
  }

  switchSection(section) {
    this.currentSection = section;

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    // Update page sections
    document.querySelectorAll('.page-section').forEach(sec => {
      sec.classList.remove('active');
    });
    document.getElementById(`${section}-section`).classList.add('active');

    // Load section-specific content
    if (section === 'favorites') {
      this.loadFavoritesPage();
    } else if (section === 'categories') {
      this.loadCategories();
    }
  }

  handleEnterKey() {
    document.getElementById('search-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchRecipes();
      }
    });
  }

  async quickSearch(query) {
    document.getElementById('search-input').value = query;
    this.switchSection('search');
    await this.searchRecipes();
  }

  async searchRecipes() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) {
      alert('Please enter a search term!');
      return;
    }

    // Switch to search section if not already there
    if (this.currentSection !== 'search') {
      this.switchSection('search');
    }

    this.showLoading();
    this.addToSearchHistory(query);

    try {
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      this.hideLoading();
      this.displayRecipes(data.meals || []);
      
      if (this.currentTab !== 'search') {
        this.switchTab('search');
      }
    } catch (error) {
      this.hideLoading();
      console.error('Error fetching recipes:', error);
      alert('Error fetching recipes. Please try again!');
    }
  }

  displayRecipes(meals) {
    const recipeList = document.getElementById('recipe-list');
    
    if (meals.length === 0) {
      recipeList.innerHTML = `
        <div class="empty-state">
          <div style="font-size: 4rem;">🍽️</div>
          <h3>No recipes found</h3>
          <p>Try searching for something else like "chicken", "pasta", or "cake"</p>
        </div>
      `;
      return;
    }

    recipeList.innerHTML = meals.map(meal => `
      <div class="recipe-card" onclick="app.showRecipeDetails('${meal.idMeal}')">
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
        <div class="card-content">
          <h3>${meal.strMeal}</h3>
          <div class="category">${meal.strCategory}</div>
          <div class="card-actions">
            <button class="btn btn-primary" onclick="event.stopPropagation(); app.showRecipeDetails('${meal.idMeal}')">
              📖 View Recipe
            </button>
            <button class="btn ${this.favorites.includes(meal.idMeal) ? 'btn-remove' : 'btn-favorite'}" 
                    onclick="event.stopPropagation(); app.toggleFavorite('${meal.idMeal}')">
              ${this.favorites.includes(meal.idMeal) ? '💔 Remove' : '❤️ Save'}
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  async showRecipeDetails(mealId) {
    try {
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
      const data = await response.json();
      const meal = data.meals[0];

      // Populate modal
      document.getElementById('modal-image').src = meal.strMealThumb;
      document.getElementById('modal-title').textContent = meal.strMeal;
      
      // Meta information
      const metaInfo = [
        `🏷️ ${meal.strCategory}`,
        `🌍 ${meal.strArea}`,
      ];
      document.getElementById('modal-meta').innerHTML = metaInfo.map(info => 
        `<div class="meta-item">${info}</div>`
      ).join('');

      // Ingredients
      const ingredients = this.getIngredients(meal);
      document.getElementById('modal-ingredients').innerHTML = ingredients.map(ing => 
        `<div class="ingredient-item"><strong>${ing.measure}</strong> ${ing.ingredient}</div>`
      ).join('');

      // Instructions
      document.getElementById('modal-instructions').textContent = meal.strInstructions;

      // YouTube link
      const youtubeDiv = document.getElementById('modal-youtube');
      if (meal.strYoutube) {
        youtubeDiv.innerHTML = `
          <a href="${meal.strYoutube}" target="_blank" class="youtube-link">
            🎥 Watch Tutorial on YouTube
          </a>
        `;
      } else {
        youtubeDiv.innerHTML = '';
      }

      // Show modal
      document.getElementById('recipe-modal').style.display = 'block';
      document.body.style.overflow = 'hidden';
    } catch (error) {
      console.error('Error fetching recipe details:', error);
      alert('Error loading recipe details!');
    }
  }

  getIngredients(meal) {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ingredient && ingredient.trim()) {
        ingredients.push({
          ingredient: ingredient.trim(),
          measure: measure ? measure.trim() : ''
        });
      }
    }
    return ingredients;
  }

  closeModal() {
    document.getElementById('recipe-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  async toggleFavorite(mealId) {
    const index = this.favorites.indexOf(mealId);
    
    if (index > -1) {
      this.favorites.splice(index, 1);
    } else {
      this.favorites.push(mealId);
    }
    
    localStorage.setItem('favorites', JSON.stringify(this.favorites));
    this.updateFavoritesCount();
    
    // Refresh current view
    if (this.currentTab === 'search') {
      // Re-render search results to update favorite buttons
      const recipeCards = document.querySelectorAll('.recipe-card');
      recipeCards.forEach(card => {
        const button = card.querySelector('.btn-favorite, .btn-remove');
        if (button && button.onclick.toString().includes(mealId)) {
          if (this.favorites.includes(mealId)) {
            button.className = 'btn btn-remove';
            button.innerHTML = '💔 Remove';
          } else {
            button.className = 'btn btn-favorite';
            button.innerHTML = '❤️ Save';
          }
        }
      });
    } else if (this.currentTab === 'favorites') {
      this.loadFavorites();
    }

    // Update favorites page if currently viewing it
    if (this.currentSection === 'favorites') {
      this.loadFavoritesPage();
    }
  }

  updateFavoritesCount() {
    const countElement = document.getElementById('favorites-count');
    countElement.textContent = this.favorites.length;
    countElement.style.display = this.favorites.length > 0 ? 'inline-block' : 'none';
  }

  async loadFavorites() {
    const favoritesList = document.getElementById('favorites-list');
    
    if (this.favorites.length === 0) {
      favoritesList.innerHTML = `
        <div class="empty-state">
          <div style="font-size: 4rem;">❤️</div>
          <h3>No favorite recipes yet</h3>
          <p>Search for recipes and save your favorites!</p>
        </div>
      `;
      return;
    }

    try {
      const favoriteRecipes = await Promise.all(
        this.favorites.map(async (id) => {
          const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
          const data = await response.json();
          return data.meals[0];
        })
      );

      favoritesList.innerHTML = favoriteRecipes.map(meal => `
        <div class="recipe-card" onclick="app.showRecipeDetails('${meal.idMeal}')">
          <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
          <div class="card-content">
            <h3>${meal.strMeal}</h3>
            <div class="category">${meal.strCategory}</div>
            <div class="card-actions">
              <button class="btn btn-primary" onclick="event.stopPropagation(); app.showRecipeDetails('${meal.idMeal}')">
                📖 View Recipe
              </button>
              <button class="btn btn-remove" onclick="event.stopPropagation(); app.toggleFavorite('${meal.idMeal}')">
                💔 Remove
              </button>
            </div>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Error loading favorites:', error);
      favoritesList.innerHTML = `
        <div class="empty-state">
          <div style="font-size: 4rem;">❌</div>
          <h3>Error loading favorites</h3>
          <p>Please try again later</p>
        </div>
      `;
    }
  }

  async loadFavoritesPage() {
    const favoritesPageList = document.getElementById('favorites-page-list');
    
    if (this.favorites.length === 0) {
      favoritesPageList.innerHTML = `
        <div class="empty-state">
          <div style="font-size: 4rem;">❤️</div>
          <h3>No favorite recipes yet</h3>
          <p>Search for recipes and save your favorites!</p>
          <button class="quick-search-btn" onclick="app.switchSection('search')" style="margin-top: 20px;">
            🔍 Start Searching
          </button>
        </div>
      `;
      return;
    }

    try {
      const favoriteRecipes = await Promise.all(
        this.favorites.map(async (id) => {
          const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
          const data = await response.json();
          return data.meals[0];
        })
      );

      favoritesPageList.innerHTML = favoriteRecipes.map(meal => `
        <div class="recipe-card" onclick="app.showRecipeDetails('${meal.idMeal}')">
          <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
          <div class="card-content">
            <h3>${meal.strMeal}</h3>
            <div class="category">${meal.strCategory}</div>
            <div class="card-actions">
              <button class="btn btn-primary" onclick="event.stopPropagation(); app.showRecipeDetails('${meal.idMeal}')">
                📖 View Recipe
              </button>
              <button class="btn btn-remove" onclick="event.stopPropagation(); app.toggleFavorite('${meal.idMeal}')">
                💔 Remove
              </button>
            </div>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Error loading favorites:', error);
      favoritesPageList.innerHTML = `
        <div class="empty-state">
          <div style="font-size: 4rem;">❌</div>
          <h3>Error loading favorites</h3>
          <p>Please try again later</p>
        </div>
      `;
    }
  }

  async loadCategories() {
    const categoriesList = document.getElementById('categories-list');
    
    try {
      const response = await fetch('https://www.themealdb.com/api/json/v1/1/categories.php');
      const data = await response.json();
      this.categories = data.categories || [];

      const categoryIcons = {
        'Beef': '🥩',
        'Chicken': '🐔',
        'Dessert': '🍰',
        'Lamb': '🐑',
        'Miscellaneous': '🍽️',
        'Pasta': '🍝',
        'Pork': '🐷',
        'Seafood': '🐟',
        'Side': '🥗',
        'Starter': '🥗',
        'Vegan': '🌱',
        'Vegetarian': '🥬',
        'Breakfast': '🍳',
        'Goat': '🐐',
        'Unknown': '❓'
      };

      categoriesList.innerHTML = this.categories.map(category => `
        <div class="category-card" onclick="app.searchByCategory('${category.strCategory}')">
          <span class="category-icon">${categoryIcons[category.strCategory] || '🍽️'}</span>
          <div class="category-name">${category.strCategory}</div>
          <div class="category-count">Click to explore</div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Error loading categories:', error);
      categoriesList.innerHTML = `
        <div class="empty-state">
          <div style="font-size: 4rem;">❌</div>
          <h3>Error loading categories</h3>
          <p>Please try again later</p>
        </div>
      `;
    }
  }

  async searchByCategory(category) {
    try {
      this.switchSection('search');
      this.showLoading();

      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`);
      const data = await response.json();
      
      this.hideLoading();
      this.displayRecipes(data.meals || []);
      
      document.getElementById('search-input').value = category;
      this.addToSearchHistory(category);
      
      if (this.currentTab !== 'search') {
        this.switchTab('search');
      }
    } catch (error) {
      this.hideLoading();
      console.error('Error fetching category recipes:', error);
      alert('Error fetching recipes. Please try again!');
    }
  }

  switchTab(tab) {
    this.currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    // Update content sections within search page
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.remove('active');
    });
    
    if (tab === 'search') {
      document.getElementById('search-results-section').classList.add('active');
    } else if (tab === 'favorites') {
      document.getElementById('favorites-results-section').classList.add('active');
      this.loadFavorites();
    }
  }

  addToSearchHistory(query) {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Remove if already exists
    this.searchHistory = this.searchHistory.filter(item => 
      item.toLowerCase() !== normalizedQuery
    );
    
    // Add to beginning
    this.searchHistory.unshift(query);
    
    // Keep only last 5 searches
    this.searchHistory = this.searchHistory.slice(0, 5);
    
    localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    this.loadSearchHistory();
  }

  loadSearchHistory() {
    const historyDiv = document.getElementById('search-history');
    
    if (this.searchHistory.length === 0) {
      historyDiv.innerHTML = '';
      return;
    }
    
    historyDiv.innerHTML = `
      <p style="margin-bottom: 10px; color: #666; font-size: 0.9rem;">Recent searches:</p>
      ${this.searchHistory.map(term => 
        `<span class="history-item">${term}</span>`
      ).join('')}
    `;
  }

  showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('recipe-list').innerHTML = '';
    document.getElementById('search-btn').disabled = true;
    document.getElementById('search-btn').textContent = 'Searching...';
  }

  hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('search-btn').disabled = false;
    document.getElementById('search-btn').innerHTML = '🔍 Search';
  }
}

// Initialize the app
const app = new RecipeFinder();

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    app.closeModal();
  }
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});