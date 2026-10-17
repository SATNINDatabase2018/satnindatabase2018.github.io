async function loadCollection() {

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
        window.location.href =
            "login.html";
        return;
    }

    const response =
        await fetch(
            "data/database.json"
        );

    const allItems =
        await response.json();

    const {
        data: ownedRows,
        error
    } =
        await supabaseClient
        .from("user_items")
        .select("item_id")
        .eq("owned", true);

    if (error) {
        console.error(error);
        return;
    }

    const ownedIds =
        new Set(
            ownedRows.map(
                row => row.item_id
            )
        );

    const ownedItems =
        allItems.filter(
            item =>
                ownedIds.has(item.id)
        );

    document.getElementById(
        "collection-count"
    ).textContent =
        `${ownedItems.length} items owned`;

    const grid =
        document.getElementById(
            "collection-grid"
        );

    ownedItems.forEach(
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
                >

                <h3>
                    ${item.title}
                </h3>

                <p>
                    ${item.section || ""}
                </p>
            `;

            grid.appendChild(card);
        }
    );
}


loadCollection();
