async function updateNavbar() {

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();


    const accountLink =
        document.getElementById(
            "account-link"
        );


    if (!accountLink) {
        return;
    }


    if (user) {

        const username =
            user.user_metadata?.username;

        accountLink.textContent =
            username || "My Account";

    } else {

        accountLink.textContent =
            "Login";

    }

}


updateNavbar();


supabaseClient.auth.onAuthStateChange(
    () => {

        updateNavbar();

    }
);
