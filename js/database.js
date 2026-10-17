let databaseItems = [];


async function loadDatabase() {

    const response =
        await fetch("data/database.json");

    databaseItems =
        await response.json();

    renderDatabase();
}


function renderDatabase() {

    const grid =
        document.getElementById(
            "database-grid"
        );

    const search =
        document.getElementById(
            "search"
        ).value.toLowerCase();

    const category =
        document.getElementById(
            "category-filter"
        ).value;

    const filtered =
        databaseItems.filter(
            item => {

                const matchesSearch =
                    item.title
                    .toLowerCase()
                    .includes(search);

                const matchesCategory =
                    !category ||
                    item.category === category;

                return (
                    matchesSearch &&
                    matchesCategory
                );
            }
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
        renderDatabase
    );


document
    .getElementById(
        "category-filter"
    )
    .addEventListener(
        "change",
        renderDatabase
    );


loadDatabase();
