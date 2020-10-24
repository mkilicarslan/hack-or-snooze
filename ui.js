$(async function () {
	// cache some selectors we'll be using quite a bit
	const $allStoriesList = $("#all-articles-list");
	const $submitForm = $("#submit-form");
	const $favoritedArticles = $("#favorited-articles");
	const $filteredArticles = $("#filtered-articles");
	const $loginForm = $("#login-form");
	const $createAccountForm = $("#create-account-form");
	const $ownStories = $("#my-articles");
	const $userProfile = $("#user-profile");

	const $navLogin = $("#nav-login");
	const $navLogOut = $("#nav-logout");
	const $navSubmit = $("#nav-submit");
	const $navFavorites = $("#nav-favorites");
	const $navMyStories = $("#nav-my-stories");
	const $navUserProfile = $("#nav-user-profile");

	// global storyList variable
	let storyList = null;

	// global currentUser variable
	let currentUser = null;

	hideElements();
	await checkIfLoggedIn();
	await generateStories();
	await generateFavoritedStories();
	await generateOwnStories();

	$allStoriesList.show();

	/**
	 * Event listener for logging in.
	 *  If successfully we will setup the user instance
	 */
	$loginForm.on("submit", async function (evt) {
		evt.preventDefault(); // no page-refresh on submit

		// grab the username and password
		const username = $("#login-username").val();
		const password = $("#login-password").val();

		// call the login static method to build a user instance
		const userInstance = await User.login(username, password);
		// set the global user to the user instance
		currentUser = userInstance;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
	 * Event listener for signing up.
	 *  If successfully we will setup a new user instance
	 */
	$createAccountForm.on("submit", async function (evt) {
		evt.preventDefault(); // no page refresh

		// grab the required fields
		let name = $("#create-account-name").val();
		let username = $("#create-account-username").val();
		let password = $("#create-account-password").val();

		// call the create method, which calls the API and then builds a new user instance
		const newUser = await User.create(username, password, name);
		currentUser = newUser;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
	 * Event listener for submitting new story form
	 */
	$submitForm.on("submit", async function (evt) {
		evt.preventDefault(); // no page refresh

		// grab the required fields
		const author = $("#author").val();
		const title = $("#title").val();
		const url = $("#url").val();
		const storyObj = { author, title, url };

		// call the create method, which calls the API and then builds a new user instance
		const newStory = await StoryList.addStory(currentUser, storyObj);

		// Update current user data
		const token = localStorage.getItem("token");
		const username = localStorage.getItem("username");
		currentUser = await User.getLoggedInUser(token, username);

		// Update UI
		await generateOwnStories();
		await generateStories();

		$submitForm.slideToggle();
	});

	/**
	 * Log Out Functionality
	 */
	$navLogOut.on("click", function () {
		// empty out local storage
		localStorage.clear();
		// refresh the page, clearing memory
		location.reload();
	});

	/**
	 * Event Handler for Clicking Login
	 */
	$navLogin.on("click", function () {
		// Show the Login and Create Account Forms
		$loginForm.slideToggle();
		$createAccountForm.slideToggle();
		$allStoriesList.toggle();
	});

	/**
	 * Event Handler for clicking submit link
	 */
	$navSubmit.on("click", function () {
		hideElements();
		$submitForm.slideToggle();
		$allStoriesList.show();
	});

	// TODO: Navigation handler
	$("body").on("click", "#nav-all", async function () {
		hideElements();
		$allStoriesList.show();
		// evt.taaget
		navigationHandlere("favoritedArticles");
	});

	/**
	 * Event Handler for clicking favorites link
	 */
	$navFavorites.on("click", async function () {
		hideElements();
		$favoritedArticles.show();
	});

	/**
	 * Event Handler for clicking my stories link
	 */
	$navMyStories.on("click", async function () {
		hideElements();
		$ownStories.show();
	});

	/**
	 * Event Handler for clicking my stories link
	 */
	$navUserProfile.on("click", async function () {
		hideElements();
		$userProfile.show();
	});

	/**
	 * Event handler for Navigation to Homepage
	 */
	$("body").on("click", "#nav-all", async function () {
		hideElements();
		$allStoriesList.show();
	});

	/**
	 * Event handler for favorite-unfavorite story
	 */
	$("body").on("click", ".fa-star", async function () {
		const storyId = $(this).closest("li").attr("id");

		let newFavSories;
		if ($(this).prop("classList").contains("far")) {
			newFavSories = await User.favoriteStory(currentUser, storyId);
		} else {
			newFavSories = await User.unfavoriteStory(currentUser, storyId);
		}

		currentUser.favorites = newFavSories;

		await generateFavoritedStories();
		await generateStories();
		await generateOwnStories();
	});

	/**
	 * Event handler for favorite-unfavorite story
	 */
	$("body").on("click", ".fa-trash-alt", async function () {
		const storyId = $(this).closest("li").attr("id");

		await Story.deleteStory(currentUser, storyId);

		// Update current user data
		const token = localStorage.getItem("token");
		const username = localStorage.getItem("username");
		currentUser = await User.getLoggedInUser(token, username);

		// Update UI
		await generateOwnStories();
		await generateStories();
	});

	/**
	 * On page load, checks local storage to see if the user is already logged in.
	 * Renders page information accordingly.
	 */
	async function checkIfLoggedIn() {
		// let's see if we're logged in
		const token = localStorage.getItem("token");
		const username = localStorage.getItem("username");

		// if there is a token in localStorage, call User.getLoggedInUser
		//  to get an instance of User with the right details
		//  this is designed to run once, on page load
		currentUser = await User.getLoggedInUser(token, username);
		await generateStories();

		if (currentUser) {
			showNavForLoggedInUser();
			// Fill profile info
			$("#profile-name").append(document.createTextNode(currentUser.name));
			$("#profile-username").append(document.createTextNode(currentUser.username));
			$("#profile-account-date").append(document.createTextNode(currentUser.createdAt.substring(0, 9)));
			// Display '|' signs
			$(".main-nav-links span").show();
			$(".nav-right-logged-in").show();
			$(".nav-right-logged-out").hide();
		} else {
			$(".nav-right-logged-in").hide();
			$(".nav-right-logged-out").show();

			// Hide '|' signs
			$(".main-nav-links span").hide();
		}
	}

	/**
	 * A rendering function to run to reset the forms and hide the login info
	 */
	function loginAndSubmitForm() {
		// hide the forms for logging in and signing up
		$loginForm.hide();
		$createAccountForm.hide();

		// reset those forms
		$loginForm.trigger("reset");
		$createAccountForm.trigger("reset");

		// show the stories
		$allStoriesList.show();

		// update the navigation bar
		showNavForLoggedInUser();

		// Fill the user info
	}

	/**
	 * A rendering function to call the StoryList.getStories static method,
	 *  which will generate a storyListInstance. Then render it.
	 */
	async function generateStories() {
		// get an instance of StoryList
		const storyListInstance = await StoryList.getStories();
		// update our global variable
		storyList = storyListInstance;
		// empty out that part of the page
		$allStoriesList.empty();

		// loop through all of our stories and generate HTML for them
		for (let story of storyList.stories) {
			const result = generateStoryHTML(story);
			$allStoriesList.append(result);
		}
	}

	/**
	 * A rendering function to call the StoryList.getStories static method,
	 *  which will generate a storyListInstance. Then render it.
	 */
	async function generateFavoritedStories() {
		const favoritedStoryArticleIds = (currentUser && currentUser.favorites.map((i) => i.storyId)) || [];
		// get an instance of StoryList
		const storyListInstance = await StoryList.getStories();

		// empty out that part of the page
		$favoritedArticles.empty();

		if (favoritedStoryArticleIds.length) {
			// loop through all of our stories and generate HTML for them
			for (let story of storyListInstance.stories) {
				if (favoritedStoryArticleIds.includes(story.storyId)) {
					const html = generateStoryHTML(story);
					$favoritedArticles.append(html);
				}
			}
		} else {
			const html = "<p>No favorites added!</p>";
			$favoritedArticles.append(html);
		}
	}

	/**
	 * A rendering function to call the StoryList.getStories static method,
	 *  which will generate a storyListInstance. Then render it.
	 */
	async function generateOwnStories() {
		const ownStoriesIds = (currentUser && currentUser.ownStories.map((i) => i.storyId)) || [];

		// get an instance of StoryList
		const storyListInstance = await StoryList.getStories();

		// empty out that part of the page
		$ownStories.empty();

		if (ownStoriesIds.length) {
			// loop through all of our stories and generate HTML for them
			for (let story of storyListInstance.stories) {
				if (ownStoriesIds.includes(story.storyId)) {
					const result = generateStoryHTML(story, true);
					$ownStories.append(result);
				}
			}
		} else {
			const html = "<p>No stories added by user yet!</p>";
			$ownStories.append(html);
		}
	}

	/**
	 * A function to render HTML for an individual Story instance
	 */
	function generateStoryHTML(story, isOwnStory) {
		const hostName = getHostName(story.url);
		const starClass = currentUser && currentUser.favorites.find((i) => i.storyId === story.storyId) ? "fas" : "far";

		const deleteIcon = `
		<span class="trash-can">
			<i class="fas fa-trash-alt"></i>
		</span>
		`;
		// render story markup
		const storyMarkup = $(`
	  <li id="${story.storyId}">
		${isOwnStory ? deleteIcon : ""}
	  	<span class="star">
          <i class="${starClass || ""} fa-star"></i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

		return storyMarkup;
	}

	/* hide all elements in elementsArr */

	function hideElements() {
		const elementsArr = [
			$submitForm,
			$allStoriesList,
			$filteredArticles,
			$favoritedArticles,
			$ownStories,
			$loginForm,
			$createAccountForm,
			$userProfile,
		];
		elementsArr.forEach(($elem) => $elem.hide());
	}

	function showNavForLoggedInUser() {
		$navLogin.hide();
		$navSubmit.show();
		$navFavorites.show();
		$navMyStories.show();
		$navUserProfile.text(currentUser.username).show();
		$navLogOut.show();

		$(".nav-right-logged-in").show();
		$(".nav-right-logged-out").hide();
	}

	/* simple function to pull the hostname from a URL */

	function getHostName(url) {
		let hostName;
		if (url.indexOf("://") > -1) {
			hostName = url.split("/")[2];
		} else {
			hostName = url.split("/")[0];
		}
		if (hostName.slice(0, 4) === "www.") {
			hostName = hostName.slice(4);
		}
		return hostName;
	}

	/* sync current user information to localStorage */

	function syncCurrentUserToLocalStorage() {
		if (currentUser) {
			localStorage.setItem("token", currentUser.loginToken);
			localStorage.setItem("username", currentUser.username);
		}
	}
});
