import type { Client, Employee } from '../types';

const MOCK_CLIENTS: Client[] = [
  { id: 101, fullName: 'Иван Иванов', login: 'ivan_i', phone: '+7 (999) 123-45-67', email: 'ivan.i@example.com', address: 'г. Москва, ул. Ленина, д. 10' },
  { id: 102, fullName: 'Анна Смирнова', login: 'a_smirnova', phone: '+7 (911) 222-33-44', email: 'anna.s@example.com', address: 'г. Санкт-Петербург, пр. Мира, д. 5' },
  { id: 103, fullName: 'Петр Сидоров', login: 'p_sidorov', phone: '+7 (922) 333-44-55', email: 'petr.s@example.com', address: 'г. Казань, ул. Пушкина, д. 12' },
  { id: 104, fullName: 'Елена Крылова', login: 'e_krylova', phone: '+7 (933) 444-55-66', email: 'elena.k@example.com', address: 'г. Екатеринбург, ул. Малышева, д. 8' },
  { id: 105, fullName: 'Дмитрий Волков', login: 'd_volkov', phone: '+7 (944) 555-66-77', email: 'dmitry.v@example.com', address: 'г. Новосибирск, ул. Ленина, д. 45' },
];

const MOCK_EMPLOYEES: Employee[] = [
  { id: '001', fullName: 'Михаил Алексеев', login: 'm_alekseev', phone: '+7 (900) 111-22-33', email: 'm.alekseev@service.ru', role: 'Директор' },
  { id: '002', fullName: 'Алексей Петров', login: 'a_petrov', phone: '+7 (900) 222-33-44', email: 'a.petrov@service.ru', role: 'Техник' },
  { id: '003', fullName: 'Мария Соколова', login: 'm_sokolova', phone: '+7 (900) 333-44-55', email: 'm.sokolova@service.ru', role: 'Менеджер' },
  { id: '004', fullName: 'Сергей Иванов', login: 's_ivanov', phone: '+7 (900) 444-55-66', email: 's.ivanov@service.ru', role: 'Кладовщик' },
  { id: '005', fullName: 'Ольга Кузнецова', login: 'o_kuznetsova', phone: '+7 (900) 555-66-77', email: 'o.kuznetsova@service.ru', role: 'Техник' },
];

export async function fetchClients(): Promise<Client[]> {
  return new Promise((resolve) => setTimeout(() => resolve(MOCK_CLIENTS), 300));
}

export async function fetchEmployees(): Promise<Employee[]> {
  return new Promise((resolve) => setTimeout(() => resolve(MOCK_EMPLOYEES), 300));
}
