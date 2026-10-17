let categoryItems = [];


async function loadCategoryPage() {

    const response =
        await fetch("data/database.json");

    const allItems =
        await response.json();

    categoryItems =
        allItems.filter(
            item =>
                item.category === window.PAGE_CATEGORY
        );

    renderCategoryPage();
}


function renderCategoryPage() {

    const grid =
        document.getElementById(
            "database-grid"
        );

    const search =
        document.getElementById(
            "search"
        ).value.toLowerCase();

    const filtered =
        categoryItems.filter(
            item =>
                item.title
                .toLowerCase()
                .includes(search)
        );

    grid.innerHTML = "";

    filtered.forEach(
        item => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "item-card";

            card.innerHTML = `

                <img
                    src="${item.image || ""}"
                    alt="${item.title}"
                >

                <h3>
                    ${item.title}
                </h3>

                <p>
                    ${item.section || ""}
                </p>

                <p>
                    JS: ${item.js ?? "—"}
                </p>

                <p>
                    SC: ${item.sc ?? "—"}
                </p>

                <p>
                    ${item.shop || ""}
                </p>

                <div class="item-actions">

                    <button
                        onclick="setOwned(${item.id})"
                    >
                        ✓ I own this
                    </button>

                    <button
                        onclick="setWishlist(${item.id})"
                    >
                        ☆ Wishlist
                    </button>

                    <button
                        onclick="setFavorite(${item.id})"
                    >
                        ♡ Favorite
                    </button>

                </div>
            `;

            grid.appendChild(card);
        }
    );
}


document
    .getElementById("search")
    .addEventListener(
        "input",
        renderCategoryPage
    );


async function getCurrentUser() {

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    return user;
}


async function setOwned(itemId) {

    const user =
        await getCurrentUser();

    if (!user) {
        alert("Please log in first.");
        window.location.href = "login.html";
        return;
    }

    const { error } =
        await supabaseClient
        .from("user_items")
        .upsert(
            {
                user_id: user.id,
                item_id: itemId,
                owned: true
            },
            {
                onConflict:
                    "user_id,item_id"
            }
        );

    if (error) {
        console.error(error);
        alert("Could not save item.");
        return;
    }

    alert("Added to your collection!");
}


async function setWishlist(itemId) {

    const user =
        await getCurrentUser();

    if (!user) {
        alert("Please log in first.");
        return;
    }

    const { error } =
        await supabaseClient
        .from("user_items")
        .upsert(
            {
                user_id: user.id,
                item_id: itemId,
                wishlist: true
            },
            {
                onConflict:
                    "user_id,item_id"
            }
        );

    if (error) {
        console.error(error);
        return;
    }

    alert("Added to wishlist!");
}


async function setFavorite(itemId) {

    const user =
        await getCurrentUser();

    if (!user) {
        alert("Please log in first.");
        return;
    }

    const { error } =
        await supabaseClient
        .from("user_items")
        .upsert(
            {
                user_id: user.id,
                item_id: itemId,
                favorite: true
            },
            {
                onConflict:
                    "user_id,item_id"
            }
        );

    if (error) {
        console.error(error);
        return;
    }

    alert("Added to favorites!");
}


loadCategoryPage();
