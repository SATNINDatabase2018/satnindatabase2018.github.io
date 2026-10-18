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

        const username = document.getElementById('signup-username').value.trim();
        if(!username||username.length>80||username.includes('@')){document.getElementById('signup-message').textContent='Choose a username of 1–80 characters without @.';return;}

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
                        new URL("./", document.baseURI).href

                }

            });


        const message =
            document.getElementById(
                "signup-message"
            );


        if (error) {

            message.textContent = /over_email_send_rate_limit|email rate limit/i.test((error.code||'')+' '+(error.message||''))
                ? 'Email rate limit exceeded. Try logging in with Discord using the Continue with Discord button above, or try email again later.'
                : error.message;

            return;

        }


        message.textContent =
            data.session
                ? "Account created. You are logged in."
                : "Account created. Check your email for a message from Supabase Auth to confirm your email address. If you don’t see it, check your spam or junk folder.";

    }
);


async function logIn(){
    const identifier=document.getElementById('login-email').value.trim();
    const password=document.getElementById('login-password').value;
    const message=document.getElementById('login-message');
    if(!identifier||!password){message.textContent='Enter your email address and password.';return;}
    if(!document.getElementById('login-email').reportValidity())return;
    if(loginButton.disabled)return;loginButton.disabled=true;message.textContent='Logging in…';
    try{
      const {error}=await supabaseClient.auth.signInWithPassword({email:identifier,password});if(error)throw error;
      document.getElementById('login-password').value='';message.textContent='Logged in!';await updateAccountDisplay();
    }catch(e){message.textContent=e.message||'Could not log in. Please try again.';}
    finally{loginButton.disabled=false;}
}
loginButton.addEventListener('click',logIn);
['login-email','login-password'].forEach(id=>document.getElementById(id).addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();logIn();}}));

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
