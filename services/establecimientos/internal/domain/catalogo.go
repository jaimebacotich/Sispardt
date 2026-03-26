package domain

type Clasificacion struct {
	ID          int     `json:"id"`
	Nombre      string  `json:"nombre"`
	Descripcion *string `json:"descripcion,omitempty"`
}

type Servicio struct {
	ID          int     `json:"id"`
	Nombre      string  `json:"nombre"`
	Descripcion *string `json:"descripcion,omitempty"`
}

type TipoHabitacion struct {
	ID          int     `json:"id"`
	Nombre      string  `json:"nombre"`
	Descripcion *string `json:"descripcion,omitempty"`
}

type TipoPersonal struct {
	ID          int     `json:"id"`
	Nombre      string  `json:"nombre"`
	Descripcion *string `json:"descripcion,omitempty"`
}

type TipoCama struct {
	ID                int     `json:"id"`
	Nombre            string  `json:"nombre"`
	CapacidadPersonas int     `json:"capacidadPersonas"`
	Descripcion       *string `json:"descripcion,omitempty"`
}

type Pais struct {
	ID        int    `json:"id"`
	Nombre    string `json:"nombre"`
	CodigoIso string `json:"codigoIso"`
	EsSistema bool   `json:"esSistema"`
}

type DivisionPrincipal struct {
	ID         int    `json:"id"`
	PaisID     int    `json:"paisId"`
	PaisNombre string `json:"paisNombre,omitempty"`
	Nombre     string `json:"nombre"`
	EsSistema  bool   `json:"esSistema"`
}

type DivisionSecundaria struct {
	ID                      int    `json:"id"`
	DivisionPrincipalID     int    `json:"divisionPrincipalId"`
	DivisionPrincipalNombre string `json:"divisionPrincipalNombre,omitempty"`
	Nombre                  string `json:"nombre"`
	EsSistema               bool   `json:"esSistema"`
}
