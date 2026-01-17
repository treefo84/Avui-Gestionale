<?php
/**
 * Plugin Name: Avui Gestionale API
 * Description: API private per gestionale React
 * Version: 1.0
 */

add_action('rest_api_init', function () {

  register_rest_route('avui/v1', '/state', [
    'methods'  => 'GET',
    'callback' => 'avui_get_state',
    'permission_callback' => '__return_true'
  ]);

  register_rest_route('avui/v1', '/update', [
    'methods'  => 'POST',
    'callback' => 'avui_update_state',
    'permission_callback' => '__return_true'
  ]);

});

// Aggiungi questa route alle tue rotte API esistenti
add_action('rest_api_init', function () {
    // ... le tue altre rotte ...

    // NUOVA ROTTA PER IL LOGIN
    register_rest_route('avui/v1', '/login', array(
        'methods' => 'POST',
        'callback' => 'avui_api_login',
        'permission_callback' => '__return_true', // Aperto a tutti per poter fare login
    ));
});

function avui_api_login($request) {
    $creds = $request->get_json_params();

    // WordPress controlla username e password reali
    $user = wp_signon(array(
        'user_login'    => $creds['username'],
        'user_password' => $creds['password'],
        'remember'      => true,
    ), false);

    if (is_wp_error($user)) {
        return new WP_Error('rest_forbidden', 'Credenziali errate', array('status' => 403));
    }

    // Se OK, restituisce i dati dell'utente (senza password!)
    return array(
        'id' => (string)$user->ID,
        'name' => $user->display_name,
        'username' => $user->user_login,
        'email' => $user->user_email,
        'role' => 'INSTRUCTOR', // Qui dovresti recuperare il ruolo vero dai meta
        'isAdmin' => in_array('administrator', $user->roles),
        'avatar' => get_avatar_url($user->ID),
        // ... altri campi che ti servono
    );
}

function avui_get_state() {
  global $wpdb;
  $table = $wpdb->prefix . 'avui_state';

  $row = $wpdb->get_row("SELECT data FROM $table WHERE id = 1");

  if (!$row) {
    return [];
  }

  return json_decode($row->data, true);
}

function avui_update_state($request) {
  global $wpdb;
  $table = $wpdb->prefix . 'avui_state';

  $data = wp_json_encode($request->get_json_params());

  $wpdb->update(
    $table,
    ['data' => $data],
    ['id' => 1]
  );

  return [
    'status' => 'ok',
    'updated_at' => current_time('mysql')
  ];
}
