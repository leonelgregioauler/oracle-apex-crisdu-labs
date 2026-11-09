//Pega todos chatbots
const chatBots = document.querySelectorAll(".chatbot");

//Roda uma função para cada
chatBots.forEach((bot) => {
    //Define variavel para saber se está com o mouse em cima ou não
    let isHovering = false;

    // Mouse em cima ativa classe que aumenta icone e display mensagem
    bot.addEventListener("mouseenter", () => {
        isHovering = true;
        bot.classList.add("is_hover");
    });

    //Mouse sai de cima remove classe
    bot.addEventListener("mouseleave", () => {
        isHovering = false;
        bot.classList.remove("is_hover");
    });

    //Função para ativar mensagem a cada 10 segundos
    function cycle() {
        setTimeout(() => {
            // só ativa automático se o mouse NÃO estiver em cima
            const dialog = window.parent.document.querySelector(".modal_chat.ui-dialog")
            if (!isHovering && !dialog) {
                bot.classList.add("is_hover");
                setTimeout(() => {
                    if (!isHovering) {
                        bot.classList.remove("is_hover");
                    }
                    cycle(); // reinicia ciclo
                }, 2000);
            } else {
                // se estiver com mouse, espera terminar para tentar de novo
                cycle();
            }
        }, 10000);
    }
    cycle();
});


function alternarModalAberto() {
    const overlay = window.parent.document.querySelector(".ui-widget-overlay")
    const dialog = window.parent.document.querySelector(".modal_chat.ui-dialog")
    const body = window.parent.document.querySelector("body")
    const chatBots = window.parent.document.querySelectorAll(".chatbot");

    styles = overlay.computedStyleMap()
    display = styles.get("display").value

    if (display == "block") {
        overlay.style.display = "none"
        dialog.classList.add("fechado")
        body.classList.remove("apex-no-scroll")
        chatBots.forEach((chat) => {
            chat.style.display = "none"
        })
    } else {
        overlay.style.display = "block"
        dialog.classList.remove("fechado")
        body.classList.add("apex-no-scroll")
        setTimeout(() => {
            chatBots.forEach((chat) => {
                chat.style.display = "block"
            })
        }, 200)
    }
}