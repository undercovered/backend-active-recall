class UserRepository {
  async findByUsername(username) {
    throw new Error('UserRepository.findByUsername() not implemented.');
  }

  async findByEmail(email) {
    throw new Error('UserRepository.findByEmail() not implemented.');
  }

  async findById(id) {
    throw new Error('UserRepository.findById() not implemented.');
  }

  async create(data) {
    throw new Error('UserRepository.create() not implemented.');
  }
}

module.exports = UserRepository;
