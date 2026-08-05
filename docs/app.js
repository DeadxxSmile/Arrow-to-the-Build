const dialog = document.querySelector('#lightbox')
const image = dialog?.querySelector('img')

document.querySelectorAll('[data-lightbox]').forEach(button => {
  button.addEventListener('click', () => {
    image.src = button.dataset.lightbox
    dialog.showModal()
  })
})

dialog?.querySelector('button')?.addEventListener('click', () => dialog.close())
dialog?.addEventListener('click', event => { if (event.target === dialog) dialog.close() })
document.addEventListener('keydown', event => { if (event.key === 'Escape' && dialog?.open) dialog.close() })
