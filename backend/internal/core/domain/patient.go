package domain

// Patient es la entidad Agregada que representa a un paciente en el sistema.
type Patient struct {
	id       PatientID
	tenantID TenantID
	name     FullName
	document Document
	email    Email
}

// NewPatient crea un nuevo paciente validando las reglas de negocio e inyectando un nuevo ID.
func NewPatient(tenantID TenantID, name FullName, document Document, email Email) (*Patient, error) {
	if tenantID.IsNil() {
		return nil, ErrMissingTenantID
	}

	return &Patient{
		id:       NewPatientID(),
		tenantID: tenantID,
		name:     name,
		document: document,
		email:    email,
	}, nil
}

func UnmarshalPatient(id PatientID, tenantID TenantID, name FullName, document Document, email Email) *Patient {
	return &Patient{
		id:       id,
		tenantID: tenantID,
		name:     name,
		document: document,
		email:    email,
	}
}

// ID retorna el identificador único del paciente.
func (p *Patient) ID() PatientID {
	return p.id
}

// TenantID retorna el identificador de la clínica/tenant.
func (p *Patient) TenantID() TenantID {
	return p.tenantID
}

// Name retorna el Value Object del nombre.
func (p *Patient) Name() FullName {
	return p.name
}

// Document retorna el Value Object del documento de identidad.
func (p *Patient) Document() Document {
	return p.document
}

// Email retorna el Value Object del correo electrónico.
func (p *Patient) Email() Email {
	return p.email
}
