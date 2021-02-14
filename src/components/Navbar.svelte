<script>
  import { mode } from "../Stores/dataStore";
  import logo from "./logo.svg";
</script>

<nav class="navbar" role="navigation" aria-label="main navigation">
  <div class="navbar-brand">
    <a class="navbar-item" href="/">
      <img class="logo" src={logo} alt="logo" />
    </a>
  </div>
  <div class="navbar-menu">
    <div class="navbar-start">
      <a class="navbar-item" on:click={() => mode.set("create")}>create</a>
      <a class="navbar-item" on:click={() => mode.set("generate")}>generate</a>
    </div>
    <div class="navbar-end">
      <a class="navbar-item" href="https://github.com/max-hans/wfc-generator">
        <ion-icon
          class="nav-icon"
          name="logo-github"
          size="large"
          color="black"
        />
      </a>
      <hr class="navbar-divider" />
    </div>
  </div>
</nav>

<style>
</style>
