const signupButton =
    document.getElementById("signup-button");

const loginButton =
    document.getElementById("login-button");

const logoutButton =
    document.getElementById("logout-button");

const loggedInSection =
    document.getElementById("logged-in-section");


async function updateAccountDisplay() {

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();


    document.querySelectorAll("[data-guest-only]").forEach(section => { section.hidden = Boolean(user); });

    if (user) {

        loggedInSection.hidden = false;

        document.getElementById(
            "logged-in-email"
        ).textContent = user.email;

    } else {

        loggedInSection.hidden = true;

    }

}


signupButton.addEventListener(
    "click",
    async () => {

        const username =
            document.getElementById(
                "signup-username"
            ).value;

        const email =
            document.getElementById(
                "signup-email"
            ).value;

        const password =
            document.getElementById(
                "signup-password"
            ).value;


        const { data, error } =
            await supabaseClient.auth.signUp({

                email: email,

                password: password,

                options: {

                    data: {
                        username: username
                    },

                    emailRedirectTo:
                        window.location.origin +
                        window.location.pathname
                        .replace("login.html", "")

                }

            });


        const message =
            document.getElementById(
                "signup-message"
            );


        if (error) {

            message.textContent =
                error.message;

            return;

        }


        message.textContent =
            data.session
                ? "Account created. You are logged in."
                : "Account created. Check your email for a message from Supabase Auth to confirm your email address. If you don’t see it, check your spam or junk folder.";

    }
);


loginButton.addEventListener(
    "click",
    async () => {

        const email =
            document.getElementById(
                "login-email"
            ).value;

        const password =
            document.getElementById(
                "login-password"
            ).value;


        const { data, error } =
            await supabaseClient.auth
            .signInWithPassword({

                email: email,
                password: password

            });


        const message =
            document.getElementById(
                "login-message"
            );


        if (error) {

            message.textContent =
                error.message;

            return;

        }


        message.textContent =
            "Logged in!";


        updateAccountDisplay();

    }
);


logoutButton.addEventListener(
    "click",
    async () => {

        await supabaseClient.auth.signOut();

        updateAccountDisplay();

    }
);


updateAccountDisplay();

// Defer account reads out of the auth callback.
supabaseClient.auth.onAuthStateChange(() => setTimeout(updateAccountDisplay, 0));
